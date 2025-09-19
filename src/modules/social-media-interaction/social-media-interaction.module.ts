import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { SocialMediaInteractionController } from './controllers/social-media-interaction.controller';
import { SocialMediaInteraction } from './entities/social-media-interaction.entity';
import { SocialMediaInteractionService } from './services/social-media-interaction.service';

@Module({
  imports: [TypeOrmModule.forFeature([SocialMediaInteraction, User])],
  controllers: [SocialMediaInteractionController],
  providers: [SocialMediaInteractionService],
  exports: [SocialMediaInteractionService, TypeOrmModule],
})
export class SocialMediaInteractionModule {}
