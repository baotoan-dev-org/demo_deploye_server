import { SystemService } from '../services/system.service';
import { Route } from 'src/common/decorators/route.decorator';

@Route('system')
export class SystemController {
  constructor(private systemService: SystemService) {}
}
