import { ApiProperty, IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { GetListProposalDto } from './get-list-proposal.dto';
import { AttachFollowerDto } from '@/modules/project-task/dtos/attach-follower.dto';
import { IsString, Length } from 'class-validator';

export class UpdateFollowerDto extends IntersectionType(
  PartialType(PickType(GetListProposalDto, ['type'])),
  PartialType(PickType(AttachFollowerDto, ['followerIds'] as const)),
) {
  @ApiProperty({
    example: 'b7e2d7e2-1234-4cde-8a2b-123456789abc',
    description: 'ID dự án cha (nếu có)',
  })
  @IsString()
  @Length(36, 36, { message: 'entityId phải là UUID 36 ký tự' })
  entityId: string;
}
