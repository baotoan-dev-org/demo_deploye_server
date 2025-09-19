import { SetMetadata } from '@nestjs/common';
export const SKIP_PERMISSION_KEY = 'skipPermission';
export const SkipPermission = () => SetMetadata(SKIP_PERMISSION_KEY, true);
