import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileController } from './controllers/file.controller';
import { FileService } from './services/file.service';
import { File } from './entities/file.entity';
import { FileHandle } from './file.handle';
import { FileCron } from './file.cron';
import { Application } from '../application/entities/application.entity';
import { JobModule } from '../job/job.module';
import { UserModule } from '../user/user.module';
import { ManufacturingRecruitmentModule } from '../manufacturing-recruitment/manufacturing-recruitment.module';
import { ProjectTaskModule } from '../project-task/project-task.module';
import { JobTitleModule } from '../job-title/job-title.module';
import { DiscussionModule } from '../discussion/discussion.module';
import { Discussion } from '../discussion/entities/discussion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([File, Application, Discussion]),
    JobModule,
    ManufacturingRecruitmentModule,
    JobTitleModule,
    forwardRef(() => UserModule),
    forwardRef(() => DiscussionModule),
    forwardRef(() => ProjectTaskModule),
  ],
  controllers: [FileController],
  providers: [FileService, FileHandle, FileCron],
  exports: [FileService, FileHandle, TypeOrmModule],
})
export class FileModule {}
