import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { ManufacturingRecruitmentController } from './controllers/manufacturing-recruitment.controller';
import { ManufactBannerController } from './controllers/manufact-banner.controller';
import { ManufacturingRecruitmentService } from './services/manufacturing-recruitment.service';
import { ManufactBannerService } from './services/manufact-banner.service';
import { ManufactBanner } from './entities/manufact-banner.entity';
import { ManufacturingRecruitment } from './entities/manufacturing-recruitment.entity';


@Module({
  imports: [TypeOrmModule.forFeature([ManufactBanner, ManufacturingRecruitment, User])],
  controllers: [ManufacturingRecruitmentController, ManufactBannerController],
  providers: [ManufacturingRecruitmentService, ManufactBannerService],
  exports: [TypeOrmModule],
})
export class ManufacturingRecruitmentModule {}
