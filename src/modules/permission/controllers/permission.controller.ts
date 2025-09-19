import { PermissionService } from '../services/permission.service';
import { Route } from 'src/common/decorators/route.decorator';

@Route('permission')
export class PermissionController {
  constructor(private permissionService: PermissionService) {}
}
