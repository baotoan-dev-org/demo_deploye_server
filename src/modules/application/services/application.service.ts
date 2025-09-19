import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, FindOptionsWhere, In, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Application } from '../entities/application.entity';
import { CreateApplicationDto } from '../dtos/create-application.dto';
import { Job } from '@/modules/job/entities/job.entity';
import { ApplicationHistoryAction, ApplicationStatus } from '../application.enum';
import { GetListApplicationDto } from '../dtos/get-list-application.dto';
import { UpdateApplicationDto } from '../dtos/update-application.dto';
import { User } from '@/modules/user/entities/user.entity';
import { VALID_STATUS_TRANSITIONS } from '../application.constant';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '@/common/services/mail.service';
import { NotificationType } from '@/modules/notification/notification.enum';
import { UserType } from '@/modules/user/user.enum';
import { NotificationService } from '@/modules/notification/services/notification.service';
import * as dayjs from 'dayjs';
import { JobService } from '@/modules/job/services/job.service';
import { JobCountType } from '@/modules/job/job.enum';
import { QueryService } from '@/common/services/query.service';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { OrgUnitStatus } from '@/modules/org-unit/org-unit.enum';
import { EmailTemplate } from '@/modules/email-template/entities/email-template.entity';
import { ApplicationHistory } from '../entities/application-history.entity';

@Injectable()
export class ApplicationService {
  constructor(
    private dataSource: DataSource,

    private jobService: JobService,

    private mailService: MailService,

    private queryService: QueryService,

    private notificationService: NotificationService,

    @InjectRepository(Application)
    private applicationRepo: Repository<Application>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(OrgUnit)
    private orgUnitRepo: Repository<OrgUnit>,

    @InjectRepository(EmailTemplate)
    private emailTemplate: Repository<EmailTemplate>,

    @InjectRepository(ApplicationHistory)
    private applicationHistoryRepo: Repository<ApplicationHistory>,
  ) {}

  async createApplication(createApplicationDto: CreateApplicationDto) {
    const { name, email, phone, jobId, cvUrl, coverLetter, referralCode } = createApplicationDto;

    const [userDb, jobDb] = await Promise.all([
      this.userRepo.findOne({ where: [{ email }, { phone }], select: ['id'] }),
      this.jobRepo.findOne({ where: { id: jobId }, select: ['id', 'name'] }),
    ]);

    if (!jobDb) throw new NotFoundException('Công việc không tồn tại!');

    const candidateId = userDb?.id || uuidv4();

    const twoWeeksAgo = dayjs().subtract(2, 'week');

    const latestApplication = await this.applicationRepo.findOne({
      where: { candidateId, jobId },
      order: { createdAt: 'DESC' },
    });

    if (latestApplication && dayjs(latestApplication.createdAt).isAfter(twoWeeksAgo))
      throw new BadRequestException('Bạn đã ứng tuyển công việc này trong vòng 2 tuần trước.');

    const notifyUsers = await this.userRepo.find({
      where: [{ type: UserType.HR }],
      select: ['id'],
    });

    const applicationInsert: Partial<Application> = {
      id: uuidv4(),
      candidateId,
      jobId,
      cvUrl,
      coverLetter,
      referralCode
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await Promise.all([
          !userDb &&
            manager.insert(User, { id: candidateId, name, phone, email, type: UserType.CANDIDATE }),
          manager.insert(Application, applicationInsert),
          this.jobService.updateJobCount(manager, jobId, JobCountType.APPLIED),
        ]);

        await this.notificationService.createManyNotification({
          notification: {
            title: 'Ứng viên mới',
            content: `${name} vừa ứng tuyển vị trí ${jobDb.name}`,
            type: NotificationType.APPLICATION,
            path: `/dashboard/job-application?applicationId=${applicationInsert.id}`,
            createdById: candidateId,
            userIds: notifyUsers.map((e) => e.id),
          },
          isPushFCM: true,
          manager,
        });

        const contentMailApplicationSuccess = await this.emailTemplate.findOne({
          where: { status: ApplicationStatus.PENDING },
          select: ['content']
        })

        const variables = {
          'Tên ứng viên': `<strong>${name}</strong>`,
          'Tên vị trí': `<strong>${jobDb.name}</strong>`,
        };

        const contentSendMail = contentMailApplicationSuccess? this.renderTemplate(contentMailApplicationSuccess.content,variables) : this.mailService.getContentApplicationSuccess({
            recipientName: name,
            jobName: jobDb.name,
        })
        

        this.mailService.sendHtml({
          recipient: email,
          subject: 'Xác nhận ứng tuyển thành công',
          content: contentSendMail
        });

        await manager.insert(ApplicationHistory, {
          applicationId: applicationInsert.id,
          action: ApplicationHistoryAction.CREATED,
          createdById: candidateId
        });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async updateApplication(
    id: string,
    updateApplicationDto: UpdateApplicationDto,
    user: UserRequest,
  ) {
    const { status, subject, contentEmail, attachments, ccEmails, bccEmails } =
      updateApplicationDto;

    const applicationDb = await this.applicationRepo.findOne({
      where: { id },
      relations: { candidate: true, job: true },
      select: { id: true, status: true, job: {id: true, name: true}, candidate: { id: true, name: true, email: true } },
    });

    if (!applicationDb) throw new BadRequestException('Hồ sơ không tồn tại!');

    if (
      status &&
      status !== applicationDb.status &&
      !VALID_STATUS_TRANSITIONS[applicationDb.status].includes(status)
    )
      throw new BadRequestException(
        `Không thể chuyển trạng thái từ "${applicationDb.status}" sang "${status}"`,
      );

    const variables = {
      'Tên ứng viên': `<strong>${applicationDb.candidate.name}</strong>`,
      'Tên vị trí': applicationDb.job.name,
    };

    const finalSubject = this.renderTemplate(subject, variables);
    const finalContentEmail = this.renderTemplate(contentEmail, variables);

    delete updateApplicationDto.contentEmail;
    delete updateApplicationDto.subject;

    return await this.dataSource
      .transaction(async (manager) => {
        const promises: Promise<any>[] = [];

        // Cập nhật Application
        promises.push( manager.update(Application, id, { ...updateApplicationDto, updatedById: user.id }));

        // Cập nhật trạng thái của ứng viên khi ứng viên được chuyển sang trạng thái khác
        if( status && status !== applicationDb.status) {        
          switch (status) {
            case ApplicationStatus.INTERVIEW:
              promises.push(
                this.jobService.updateJobCount(manager, applicationDb.job.id, JobCountType.INTERVIEWED, 1),
              );
              break;
  
            case ApplicationStatus.OFFERED:
              promises.push(
                this.jobService.updateJobCount(manager, applicationDb.job.id, JobCountType.PASSED, 1),
              );
              break;
  
            case ApplicationStatus.ACCEPTANCE: // Nếu ứng viên chấp nhận lời mời làm việc, tăng số lượng ứng viên đã chấp nhận
              promises.push(
                this.jobService.updateJobCount(manager, applicationDb.job.id, JobCountType.ACCEPTANCE, 1),
              );
              break;
            case ApplicationStatus.ONBOARD: // Nếu ứng viên nhận việc, chuyển trạng thái của ứng viên sang nhân viên và tăng số lượng ứng viên đã nhận việc
              promises.push(
                manager.update(User, applicationDb.candidate.id, {
                  type: UserType.EMPLOYEE,
                }),
                this.jobService.updateJobCount(manager, applicationDb.job.id, JobCountType.ONBOARD, 1),
              );
              break;
            case ApplicationStatus.NOT_QUALIFIED: //Hồ sơ không đạt
              promises.push(
                this.jobService.updateJobCount(manager, applicationDb.job.id, JobCountType.NOT_QUALIFIED, 1),
              );
              break;
          }
        }

 
        await Promise.all(promises);

        if ( status && status !== applicationDb.status ) {
          await manager.insert(ApplicationHistory, {
            applicationId: applicationDb.id,
            action: ApplicationHistoryAction.STATUS_CHANGE,
            actorId: user.id,
            changeDetail: `Thay đổi trạng thái từ ${applicationDb.status} sang ${status}`,
            createdById: user.id
          });
        }

        /// ????
        // 3 trường hợp này k cần gửi mail
        const skipStatuses = [ApplicationStatus.ACCEPTANCE, ApplicationStatus.REJECTED, ApplicationStatus.ONBOARD];
        if (Object.values(ApplicationStatus).includes(status) && !skipStatuses.includes(status))
          this.mailService.sendHtml({
            recipient: applicationDb.candidate.email,
            subject: finalSubject,
            content: finalContentEmail,
            attachments: attachments?.map((file) => ({
              filename: file.name,
              path: file.url,
            })),
            cc: ccEmails,
            bcc: bccEmails,
          });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async deleteApplication(id: string, user: UserRequest) {
    const applicationDb = await this.applicationRepo.findOne({
      where: { id },
      select: ['id', 'status', 'jobId'],
    });

    if (!applicationDb) throw new BadRequestException('Hồ sơ không tồn tại!');

    if (applicationDb.status !== ApplicationStatus.PENDING)
      throw new BadRequestException('Thao tác không khả dụng!');

    return await this.dataSource
      .transaction(async (manager) => {
        await Promise.all([
          manager.softDelete(Application, { id }),
          this.jobService.updateJobCount(manager, applicationDb.jobId, JobCountType.APPLIED, -1),
        ]);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListApplication(getListApplicationDto: GetListApplicationDto, user: UserRequest) {
    const { page, take, orderBy, order, search, jobId, candidateId, status, orgUnitId } = getListApplicationDto;

    const whereItem: FindOptionsWhere<Application> = {
      ...(status && { status }),
      ...(candidateId && { candidate: { id: candidateId } }),
    };

    let orgUnitIds: string[] | undefined;

    let listChildManagerUnitIds: string[] | undefined;

    const isHRorAdmin = user.type === UserType.HR || user.type === UserType.ADMIN;

    if (orgUnitId) {
      // Nếu là HR hoặc có truyền orgUnitId --> chỉ lọc theo orgUnitId (nếu có)
        orgUnitIds = [orgUnitId];
    } else if (!isHRorAdmin ) {
      // Không phải HR thì lấy list orgUnit mà user quản lý
      const managedUnits = await this.orgUnitRepo.find({
        where: { managerId: user.id, status: OrgUnitStatus.ACTIVE },
        select: ['id'],
      });

      orgUnitIds = managedUnits.map((o) => o.id);

      if (orgUnitIds.length === 0 ) return { total: 0, list: [] };

    }

    if(orgUnitIds && orgUnitIds.length > 0){
      const listChildManagerUnits = await this.orgUnitRepo.find({
          where:[
            { id: In(orgUnitIds), status: OrgUnitStatus.ACTIVE },
            { parentId: In(orgUnitIds), status: OrgUnitStatus.ACTIVE}
          ],
          select: ['id']
      })
        
      listChildManagerUnitIds = listChildManagerUnits.map((o) => o.id);
      
      if (listChildManagerUnitIds.length === 0) return { total: 0, list: [] };
    }

    // Gán điều kiện where cho job
    if (jobId) {
      whereItem.job = {
        id: jobId,
        ...(listChildManagerUnitIds ? { orgUnit: { id: In(listChildManagerUnitIds) } } : {}),
      };
    } else if (listChildManagerUnitIds) {
      whereItem.job = {
        orgUnit: { id: In(listChildManagerUnitIds) },
      };
    }
 

    let where: FindOptionsWhere<Application>[] = [whereItem];

    const qb = this.applicationRepo.createQueryBuilder('application')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('job.orgUnit', 'orgUnit')
      .leftJoinAndSelect('job.position', 'position')
      .leftJoinAndSelect( 'application.referrer', 'referrer')
      .where(where)
      .select([
        'application', 
        'candidate.id',
        'candidate.name',
        'candidate.email',
        'candidate.phone',
        'candidate.gender',
        'job.id',
        'job.name',
        'job.priority',
        'orgUnit.id',
        'orgUnit.name',
        'position.id',
        'position.name',
        'referrer.name',
        'referrer.phone',
        'referrer.url',
        'referrer.id',
        'referrer.code'
      ])
      .addSelect(
        `CASE WHEN application.status = '${ApplicationStatus.ONBOARD}' THEN 1 ELSE 0 END`, 
        'status_order'
      )
      .orderBy('status_order', 'ASC')
      .addOrderBy('application.updatedAt', 'DESC')
      .skip((page - 1) * take)
      .take(take);

      if (search) {
        qb.andWhere('(candidate.name LIKE :search or candidate.email LIKE :search)', { search: `%${search}%` });
      }


    const [list, total] = await qb.getManyAndCount();

    return { total, list };
  }

  async getApplication(id: string) {
    const applicationDb = await this.applicationRepo.findOne({
      where: { id },
      relations: { candidate: true, job: { orgUnit: true, position: true } },
      select: {
        candidate: { id: true, name: true, email: true, phone: true },
        job: {
          id: true,
          name: true,
          orgUnit: { id: true, name: true },
          position: { id: true, name: true },
        },
      },
    });

    if (!applicationDb) throw new BadRequestException('Hồ sơ không tồn tại!');

    return applicationDb;
  }

  async getApplicationHistory(id: string) {
    const applicationDb = await this.applicationRepo.findOne({
      where: { id },
      select: ['id'],
    });
    if (!applicationDb) throw new BadRequestException('Hồ sơ không tồn tại!');

    const history = await this.applicationHistoryRepo.find({
      where: { applicationId: id },
      relations: { actor: true },
      select: {
        actor: { id: true, name: true, url: true },
      },
      order: { createdAt: 'DESC' },
    });
    return history;
  }

  // replace các vị trí [Tên ứng viên] [Tên vị trí trong email]
  renderTemplate(template: string, variables: Record<string, string>){
    return template.replace(/\[(.*?)\]/g, (_, key) => {
      const normalizedKey = key.trim();
      return variables[normalizedKey] ?? `[${normalizedKey}]`;
    });
  }
}
