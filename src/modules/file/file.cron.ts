import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { File } from './entities/file.entity';
import { Application } from '../application/entities/application.entity';
import { FileStatus } from './file.enum';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../user/entities/user.entity';
import { Job } from '../job/entities/job.entity';
import { ManufactBanner } from '../manufacturing-recruitment/entities/manufact-banner.entity';
import { ProjectTask } from '../project-task/entities/project-task.entity';
import { UserMovement } from '../user/entities/user-movement.entity';
import { JobTitle } from '../job-title/entities/job-title.entity';
import { Discussion } from '../discussion/entities/discussion.entity';
import { ProjectTaskProposal } from '../project-task/entities/project-task-proposal.entity';

@Injectable()
export class FileCron {
  constructor(
    @InjectRepository(File)
    private fileRepo: Repository<File>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Application)
    private applicationRepo: Repository<Application>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(ManufactBanner)
    private manufactBannerRepo: Repository<ManufactBanner>,

    @InjectRepository(ProjectTaskProposal)
    private projectTaskProposalRepo: Repository<ProjectTaskProposal>,

    @InjectRepository(ProjectTask)
    private projectTaskRepo: Repository<ProjectTask>,

    @InjectRepository(UserMovement)
    private userMovementRepo: Repository<UserMovement>,

    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>,

    @InjectRepository(Discussion)
    private discussionRepo: Repository<Discussion>,
  ) {}

  getDecodedFileName(urlStr?: string): string | null {
    try {
      if (!urlStr) return null;
      const url = new URL(urlStr);
      return decodeURIComponent(path.basename(url.pathname));
    } catch {
      return null;
    }
  }

  @Cron('0 0 1 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // 1h00 sáng: cập nhật trạng thái file
  // @Cron('*/5 * * * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Chạy mỗi 5 giây để test
  async updateFileStatusToUsed() {
    // set tạm thời file JD template
    Logger.log('Updating file status to USED...');
    const jdTemplateUrl = 'https://dev.office.sevago.local/upload/JD-Template.docx';
    const [
      files,
      applications,
      jobs,
      manufactBanners,
      jdTemplate,
      projectTasks,
      proposals,
      users,
      userMovements,
      jobTitles,
      discussions,
    ] = await Promise.all([
      this.fileRepo.find({ select: ['id', 'url', 'status'] }),
      this.applicationRepo.find({
        select: ['id', 'cvUrl', 'attachments'],
      }),
      this.jobRepo.find({ select: ['id', 'attachments'] }),
      this.manufactBannerRepo.find({ select: ['id', 'attachments'] }),
      this.fileRepo.findOne({ where: { url: jdTemplateUrl }, select: ['id'] }),
      this.projectTaskRepo.find({ select: ['id', 'attachments'] }),
      this.projectTaskProposalRepo.find({ select: ['id', 'attachments'] }),
      this.userRepo.find({ select: ['id', 'url'] }),
      this.userMovementRepo.find({ select: ['id', 'file'] }),
      this.jobTitleRepo.find({ select: ['id', 'attachments'] }),
      this.discussionRepo.find({ select: ['id', 'attachments'] }),
    ]);

    const usedFileNames = new Set<string>();

    const addFileNamesFromAttachments = (items, field = 'attachments') => {
      for (const item of items) {
        if (Array.isArray(item[field])) {
          for (const fileObj of item[field]) {
            const fileName = this.getDecodedFileName(fileObj.url);
            if (fileName) usedFileNames.add(fileName);
          }
        }
      }
    };

    for (const app of applications) {
      const cvName = this.getDecodedFileName(app.cvUrl);
      if (cvName) usedFileNames.add(cvName);
      if (Array.isArray(app.attachments)) {
        for (const fileObj of app.attachments) {
          const fileName = this.getDecodedFileName(fileObj.url);
          if (fileName) usedFileNames.add(fileName);
        }
      }
    }

    addFileNamesFromAttachments(jobs);
    addFileNamesFromAttachments(manufactBanners);
    addFileNamesFromAttachments(projectTasks);
    addFileNamesFromAttachments(proposals);
    addFileNamesFromAttachments(jobTitles);
    addFileNamesFromAttachments(discussions);

    const userAvatarUrls = new Set(users.map((u) => u.url).filter(Boolean));
    const userMovementFiles = new Set(userMovements.map((u) => u.file).filter(Boolean));

    const unusedIds: string[] = [];
    const usedIds: string[] = [];

    for (const file of files) {
      const fileName = this.getDecodedFileName(file.url);
      if (!fileName) {
        unusedIds.push(file.id);
        continue;
      }
      if (jdTemplate && file.id === jdTemplate.id) {
        usedIds.push(file.id);
        continue;
      }
      if (usedFileNames.has(fileName) || userAvatarUrls.has(file.url)) usedIds.push(file.id);
      else unusedIds.push(file.id);

      if (userMovementFiles.has(fileName)) usedIds.push(file.id);
      else unusedIds.push(file.id);
    }

    if (unusedIds.length > 0) await this.fileRepo.update(unusedIds, { status: FileStatus.UNUSED });
    if (usedIds.length > 0) await this.fileRepo.update(usedIds, { status: FileStatus.USED });
    Logger.log(`Updated file statuses: ${usedIds.length} USED, ${unusedIds.length} UNUSED`);
  }

  @Cron('0 8 1 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // 1h05 sáng: xóa file UNUSED
  // @Cron('*/10 * * * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Chạy mỗi 10 giây để test
  async removeFileInactive() {
    const uploadDir = path.resolve('office-storage', 'upload');
    const unusedFiles = await this.fileRepo.find({
      where: { status: FileStatus.UNUSED },
    });
    const unusedFileNames = new Set(
      unusedFiles.map((file) => this.getDecodedFileName(file.url)).filter(Boolean),
    );

    const filesInFolder = fs.readdirSync(uploadDir);

    for (const fileName of filesInFolder) {
      if (unusedFileNames.has(fileName)) {
        const filePath = path.join(uploadDir, fileName);
        try {
          fs.unlinkSync(filePath);
          Logger.log(`Deleted unused file: ${fileName}`);
        } catch (err) {
          console.error(`Error deleting file ${fileName}:`, err.message);
        }
      }
    }

    if (unusedFiles.length > 0) {
      await this.fileRepo.delete(unusedFiles.map((file) => file.id));
      Logger.log(`Deleted ${unusedFiles.length} unused files from DB`);
    }
  }
}
