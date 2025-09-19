import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestLoggerMiddleware } from '@/common/middlewares/request-logger.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { RootModule } from './root/root.module';
import { AuthModule } from './auth/auth.module';
import { FileModule } from './file/file.module';
import { SharedModule } from 'src/common/modules/shared.module';
import { SocketModule } from './socket/socket.module';
import { ApplicationModule } from './application/application.module';
import { JobModule } from './job/job.module';
import { FaqModule } from './faq/faq.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EmailTemplateModule } from './email-template/email-template.module';
import { DashBoardModule } from './statistical-analysis/statistical-analysis.module';
import { ProjectTaskModule } from './project-task/project-task.module';
import { IndustryModule } from './industry/industry.module';
import { PositionModule } from './position/position.module';
import { PermissionModule } from './permission/permission.module';
import { OrgUnitModule } from './org-unit/org-unit.module';
import { OtherModule } from './other/other.module';
import { JobTitleModule } from './job-title/job-title.module';
import { ManufacturingRecruitmentModule } from './manufacturing-recruitment/manufacturing-recruitment.module';
import { SocialMediaInteractionModule } from './social-media-interaction/social-media-interaction.module';
import { ExternalModule } from './external/external.module';
import { CacheModule } from '@/common/modules/cache.module';
import { DiscussionModule } from './discussion/discussion.module';
import { SalaryRangeModule } from './salary-range/salary-range.module';
import { RoomModule } from './room/room.module';
import { ProposalModule } from './proposal/proposal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env`],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        return {
          type: configService.get('DB_DIALECT'),
          host: configService.get('DB_HOST'),
          port: configService.get('DB_PORT'),
          username: configService.get('DB_USER'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
          // logging: true,
          autoLoadEntities: true,
        } as TypeOrmModuleOptions;
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    SharedModule,
    UserModule,
    RootModule,
    AuthModule,
    FileModule,
    SocketModule,
    ApplicationModule,
    JobModule,
    FaqModule,
    EmailTemplateModule,
    DashBoardModule,
    ProjectTaskModule,
    IndustryModule,
    PositionModule,
    PermissionModule,
    OtherModule,
    OrgUnitModule,
    JobTitleModule,
    ManufacturingRecruitmentModule,
    SocialMediaInteractionModule,
    DiscussionModule,
    ExternalModule,
    CacheModule,
    SalaryRangeModule,
    RoomModule,
    ProposalModule,
  ],
  controllers: [],
  providers: [],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
