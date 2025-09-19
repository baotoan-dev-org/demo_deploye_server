import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { IndustryController } from './controllers/industry.controller';
import { Industry } from './entities/industry.entity';
import { IndustryHandle } from './industry.handle';
import { IndustryService } from './services/industry.service';

@Module({
  imports: [TypeOrmModule.forFeature([Industry, User])],
  controllers: [IndustryController],
  providers: [IndustryService, IndustryHandle],
  exports: [IndustryService, IndustryHandle, TypeOrmModule],
})
export class IndustryModule {}
