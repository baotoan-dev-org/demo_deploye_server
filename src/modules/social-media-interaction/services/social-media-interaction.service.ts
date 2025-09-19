import { QueryService } from '@/common/services/query.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, FindOptionsWhere, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreateManySocialMediaInteractionDto, CreateSocialMediaInteractionDto } from '../dtos/create-social-media-interaction.dto';
import { GetListSocialMediaInteractionDto } from '../dtos/get-list-social-media-interaction.dto';
import { UpdateSocialMediaInteractionDto } from '../dtos/update-social-media-interaction.dto';
import { SocialMediaInteraction } from '../entities/social-media-interaction.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { GetEngagementRateDto } from '../dtos/get-engagement-rate.dto';

@Injectable()
export class SocialMediaInteractionService {
  constructor(
    private dataSource: DataSource,

    private queryService: QueryService,

    @InjectRepository(SocialMediaInteraction)
    private socialMediaInteractionRepo: Repository<SocialMediaInteraction>,
  ) {}

  async createSocialMediaInteraction(createSocialMediaInteractionDto: CreateSocialMediaInteractionDto, user: UserRequest) {
    const { socialPlatform, year, month } = createSocialMediaInteractionDto;

    const conflict = await this.socialMediaInteractionRepo.findOne({
      where: [{ socialPlatform, year, month }],
    });

    if (conflict) throw new BadRequestException(`Đã tồn tại dữ liệu tương tác mạng xã hội cho nền tảng ${socialPlatform}, tháng ${month}/${year}`);

    const socialMediaInteractionInsert: DeepPartial<SocialMediaInteraction> = {
      ...createSocialMediaInteractionDto,
      id: uuidv4(),
      createdById: user.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(SocialMediaInteraction, socialMediaInteractionInsert);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async createManySocialMediaInteraction(createManySocialMediaInteractionDto: CreateManySocialMediaInteractionDto, user: UserRequest) {
    const { data} = createManySocialMediaInteractionDto;

    if (!data || data.length === 0) throw new BadRequestException('Không có dữ liệu để tạo tương tác mạng xã hội');

    const conflicts = await this.socialMediaInteractionRepo.find({
      where: data.map((item) => ({
        socialPlatform: item.socialPlatform,
        year: item.year,
        month: item.month,
      })),
    });

    if (conflicts.length > 0) {
      const conflictMessages = conflicts.map(
        (item) => `Nền tảng ${item.socialPlatform}, tháng ${item.month}/${item.year}`
      );
      throw new BadRequestException(
        `Đã tồn tại dữ liệu tương tác mạng xã hội cho: ${conflictMessages.join(', ')}`
      );
    }

    // Chuẩn bị danh sách dữ liệu để insert
    const interactionsToInsert: DeepPartial<SocialMediaInteraction>[] = data.map((item) => ({
      ...item,
      id: uuidv4(),
      createdById: user.id,
    }));

    // Transaction insert nhiều bản ghi
    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(SocialMediaInteraction, interactionsToInsert);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({
          message: err.message,
          code: err.code,
          success: false,
        });
      });
  }

  async getListSocialMediaInteraction(getListSocialMediaInteractionDto: GetListSocialMediaInteractionDto) {
    let { page, take, search, socialPlatform, year, month } = getListSocialMediaInteractionDto;

    const whereItem: FindOptionsWhere<SocialMediaInteraction> = {};
    if (socialPlatform) whereItem.socialPlatform = socialPlatform;
    if (year) whereItem.year = year;
    if (month) whereItem.month = month;

    let where: FindOptionsWhere<SocialMediaInteraction>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['socialPlatform'],
        search,
        whereItem,
      });

    const [list, total] = await this.socialMediaInteractionRepo.findAndCount({
      where,
      ...this.queryService.getPagination({ page, take }),
       order: {
        year: 'DESC',
        month: 'DESC',
      }
    });

    return { page, take, total, list };
  }

  async updateSocialMediaInteraction(id: string, updateSocialMediaInteractionDto: UpdateSocialMediaInteractionDto, user: UserRequest) {
    const { socialPlatform, year, month } = updateSocialMediaInteractionDto;

    const [existsSocialMediaInteraction, conflictData] = await Promise.all([
      this.socialMediaInteractionRepo.findOne({
        where: { id },
      }),
      this.socialMediaInteractionRepo.findOne({
        where: [{ socialPlatform, year, month, id: Not(id) }],
      }),
    ]);
    if (!existsSocialMediaInteraction) throw new BadRequestException('Không tìm thấy dữ liệu tương tác mạng xã hội');

    if (conflictData)
      throw new BadRequestException(`Đã tồn tại dữ liệu tương tác mạng xã hội cho nền tảng ${socialPlatform}, tháng ${month}/${year}`);

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(SocialMediaInteraction, id, {
          ...updateSocialMediaInteractionDto,
          updatedById: user.id,
        });
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async deleteSocialMediaInteraction(id: string) {
    const existsSocialMediaInteraction = await this.socialMediaInteractionRepo.findOne({
      where: { id },
    });

    if (!existsSocialMediaInteraction) throw new BadRequestException('Không tìm thấy dữ liệu tương tác mạng xã hội');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.delete(SocialMediaInteraction, id);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getSocialMediaInteraction(id: string): Promise<SocialMediaInteraction> {

    const socialMediaInteraction = await this.socialMediaInteractionRepo.findOne({
      where: {id},
    });

    if (!socialMediaInteraction)    throw new BadRequestException('Không tìm thấy dữ liệu tương tác mạng xã hội');

    return socialMediaInteraction 
  }

  async getEngagementRate(getEngagementRateDto: GetEngagementRateDto) {
    const { socialPlatform, year, month } = getEngagementRateDto; 
    const whereItem: FindOptionsWhere<SocialMediaInteraction> = {};
    if (year) whereItem.year = year;
    else whereItem.year = new Date().getFullYear();
    if (month) whereItem.month = month;
    else whereItem.month = new Date().getMonth() + 1; 

    const where: FindOptionsWhere<SocialMediaInteraction>[] = [whereItem];

    const allSocialMediaInteractions = await this.socialMediaInteractionRepo.find({
      where,
      select: ['socialPlatform', 'followerCount', 'likeCount'],
    });

    const socialMediaInteraction = allSocialMediaInteractions.find(
      (interaction) => interaction.socialPlatform === socialPlatform,
    );
      
    if ( !socialMediaInteraction) throw new BadRequestException(`Không tìm thấy dữ liệu tương tác mạng xã hội cho nền tảng ${socialPlatform}, tháng ${whereItem.month}/${whereItem.year}`);
    
    const followerCount = socialMediaInteraction.followerCount;
    const totalFollowerCount = allSocialMediaInteractions.reduce((sum, interaction) => sum + interaction.followerCount, 0);
    const engagementRate = followerCount > 0 ? (followerCount / totalFollowerCount) * 100 : 0;
    return {
      socialPlatform,
      year: whereItem.year,
      month: whereItem.month,
      engagementRate: parseFloat(engagementRate.toFixed(2)), 
      totalFollowerCount,
      followerCount
    };
  }
}
