import { Route } from '@/common/decorators/route.decorator';
import { Get, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { RecruitmentDashboardService } from '../services/recruitment-dashboard.service';
import { GetRecruitmentDashboardDto, WeekDto } from '../dtos/get-recruitment-dashboard.dto';

@Route('recruitment-dashboard')
export class RecruitmentDashboardController {
  constructor(private readonly recruitmentDashboardService: RecruitmentDashboardService) {}

  @ApiOperation({ summary: 'Get recruitment dashboard' })
  @Get('summary')
  @JwtAuth()
  async getRecruitmentDashboardSummary(
    @Query() getRecruitmentDashboardDto: GetRecruitmentDashboardDto,
    @User() user: UserRequest,
  ) {
    return this.recruitmentDashboardService.getRecruitmentDashboardSummary(getRecruitmentDashboardDto, user);
  }
  @ApiOperation({ summary: 'Get week' })
  @Get('week')
  async getWeek(
    @Query() weekDto: WeekDto
  ) {
    return this.recruitmentDashboardService.getWeeksInMonthWithRule34(weekDto.year, weekDto.month);
  }
}
