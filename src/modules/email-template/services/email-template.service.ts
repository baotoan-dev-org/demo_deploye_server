import {
  Injectable,
  NotFoundException,
  BadRequestException,
  NotAcceptableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, DeepPartial, FindOptionsWhere, Not } from 'typeorm';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import { EmailTemplate } from '../entities/email-template.entity';
import { ApplicationStatus } from '@/modules/application/application.enum';
import { EmailTemplateHandle } from '../email-template.handle';
import { v4 as uuidv4 } from 'uuid';
import { GetContentEmailTemplateDto } from '../dto/get-content-email-template.dto';
import { GetListEmailTemplateDto } from '../dto/get-list-email-template.dto';
import { QueryService } from '@/common/services/query.service';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Injectable()
export class EmailTemplateService {
  constructor(
    private dataSource: DataSource,

    private emailTemplateHandle: EmailTemplateHandle,

    private queryService: QueryService,

    @InjectRepository(EmailTemplate)
    private emailTemplateRepo: Repository<EmailTemplate>,
  ) {}

  async createEmailTemplate(
    createEmailTemplateDto: CreateEmailTemplateDto,
    user: UserRequest,
  ): Promise<{ success: boolean }> {
    const { status } = createEmailTemplateDto;

    const existsEmail = await this.emailTemplateRepo.exists({
      where: { status },
    });

    this.emailTemplateHandle.errorConflictEmail(existsEmail);

    const insertEmailTemplate: DeepPartial<EmailTemplate> = {
      ...createEmailTemplateDto,
      id: uuidv4(),
      createdById: user.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(EmailTemplate, insertEmailTemplate);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async updateEmailTemplate(
    id: string,
    updateEmailTemplateDto: UpdateEmailTemplateDto,
    user: UserRequest,
  ): Promise<{ success: boolean }> {
    const { status } = updateEmailTemplateDto;

    const existsEmail = await this.emailTemplateRepo.exists({ where: { id } });

    if (!existsEmail) throw new NotFoundException(`Email template không tồn tại`);

    const conflictStatus = await this.emailTemplateRepo.exists({
      where: { status, id: Not(id) },
    });

    this.emailTemplateHandle.errorConflictEmail(conflictStatus);

    const updateEmailTemplate: DeepPartial<EmailTemplate> = {
      ...updateEmailTemplateDto,
      updatedById: user.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(EmailTemplate, id, updateEmailTemplate);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async deleteEmailTemplate(id: string) {
    const emailTemplate = await this.emailTemplateRepo.exists({ where: { id } });

    if (!emailTemplate) throw new NotAcceptableException('Email template not found');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.delete(EmailTemplate, id);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListEmailTemplate(getListEmailTemplateDto: GetListEmailTemplateDto) {
    const { status, search, page, take, orderBy, order } = getListEmailTemplateDto;

    const whereItem: FindOptionsWhere<EmailTemplate> = {};

    if (status) whereItem.status = status;

    let where: FindOptionsWhere<EmailTemplate>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['subject'],
        search,
        whereItem,
      });

    const [list, total] = await this.emailTemplateRepo.findAndCount({
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
    });

    const totalPage = Math.ceil(total / take);

    return { total, list };
  }

  async getEmailTemplate(idOrStatus: string): Promise<EmailTemplate> {
    const filter = Object.values(ApplicationStatus).includes(idOrStatus as ApplicationStatus)
      ? { status: idOrStatus as ApplicationStatus }
      : { id: idOrStatus };

    const emailTemplate = await this.emailTemplateRepo.findOne({ where: filter });

    if (!emailTemplate) throw new NotAcceptableException('Email template not found');

    return emailTemplate;
  }

  async getContentEmailTemplate(getContentEmailTemplateDto: GetContentEmailTemplateDto) {
    const { status } = getContentEmailTemplateDto;

    const emailTemplate = await this.emailTemplateRepo.findOne({
      where: { status },
    });

    if (!emailTemplate)
      throw new NotFoundException(`Không tìm thấy template email cho trạng thái ${status}`);

    return emailTemplate;
  }
}
