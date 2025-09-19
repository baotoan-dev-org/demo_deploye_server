import { Route } from '@/common/decorators/route.decorator';
import { ApprovalCountService } from '../services/approval-count.service';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { Get } from '@nestjs/common';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Route('approval-count')
export class ApprovalCountController {
  constructor(private approvalCountService: ApprovalCountService) {}

  @Get()
  @JwtAuth()
  async getListApprovalCounts(@User() user: UserRequest) {
    return this.approvalCountService.getListApprovalCounts(user);
  }
}
