import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { EmailTemplateController } from './controllers/email-template.controller';
import { EmailTemplateService } from './services/email-template.service';
import { EmailTemplateHandle } from './email-template.handle';
import { User } from '../user/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EmailTemplate, User])],
  providers: [EmailTemplateService, EmailTemplateHandle],
  controllers: [EmailTemplateController],
  exports:[TypeOrmModule]
})
export class EmailTemplateModule {}
