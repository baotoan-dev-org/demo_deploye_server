import { PartialType } from '@nestjs/swagger';
import { CreateSocialMediaInteractionDto } from './create-social-media-interaction.dto';

export class UpdateSocialMediaInteractionDto extends PartialType(CreateSocialMediaInteractionDto) {}
