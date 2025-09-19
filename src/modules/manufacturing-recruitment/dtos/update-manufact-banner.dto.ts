import { PartialType } from '@nestjs/swagger';
import { CreateManufactBannerDto } from './create-manufact-banner.dto';

export class UpdateManufactBannerDto extends PartialType(CreateManufactBannerDto) {}
