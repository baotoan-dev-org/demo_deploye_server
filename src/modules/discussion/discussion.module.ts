import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Discussion } from './entities/discussion.entity';
import { DiscussionTag } from './entities/discussion-tag.entity';
import { DiscussionController } from './controllers/discussion.controller';
import { UserModule } from '../user/user.module';
import { DiscussionService } from './services/discussion.service';
import { ProjectTaskModule } from '../project-task/project-task.module';
import { NotificationModule } from '../notification/notification.module';
import { DiscussionReaction } from './entities/discussion-reaction.entity';
import { SocketChatService } from '../socket/services/socket-chat.service';
import { DiscussionHistory } from './entities/discussion-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Discussion, DiscussionReaction, DiscussionTag, DiscussionHistory]),
    NotificationModule,
    forwardRef(() => UserModule),
    forwardRef(() => ProjectTaskModule),
  ],
  controllers: [DiscussionController],
  providers: [DiscussionService, SocketChatService],
  exports: [DiscussionService, SocketChatService],
})
export class DiscussionModule {}
