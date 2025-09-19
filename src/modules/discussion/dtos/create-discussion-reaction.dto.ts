import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { DiscussionReactionType } from '../discussion.enum';

export class CreateDiscussionReactionDto {
  @ApiProperty({
    description: 'Type of reaction',
    example: DiscussionReactionType.LIKE,
  })
  @IsEnum(DiscussionReactionType)
  type: DiscussionReactionType;
}
