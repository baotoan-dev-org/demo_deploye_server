import { Module } from '@nestjs/common';
import { OtherService } from './services/other.service';
import { OtherHandle } from './other.handle';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CodeConfig } from './entities/code-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CodeConfig])],
  controllers: [],
  providers: [OtherService, OtherHandle],
  exports: [OtherService, OtherHandle, TypeOrmModule],
})
export class OtherModule {}
