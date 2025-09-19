import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrderType } from '@/common/enums/order-type.enum';
import { ChangeItem, JobApproverLogDto, JobLog } from '../entities/job-log.entity';
import { CreateJobLogDto } from '../dtos/create-job-log.dto';
import { Job } from '../entities/job.entity';
import { Position } from '@/modules/position/entities/position.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { JobTitle } from '@/modules/job-title/entities/job-title.entity';
import { Industry } from '@/modules/industry/entities/industry.entity';
import { User } from '@/modules/user/entities/user.entity';
import { Application } from '@/modules/application/entities/application.entity';
import { GetRecruitmentDashboardDto } from '../dtos/get-recruitment-dashboard.dto';
import { ApplicationStatus } from '@/modules/application/application.enum';
import { JobStatus } from '../job.enum';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';

@Injectable()
export class RecruitmentDashboardService {

  constructor(
    @InjectRepository(Position)
    private positionRepo: Repository<Position>,
    
    @InjectRepository(OrgUnit)
    private orgUnitRepo: Repository<OrgUnit>,

    @InjectRepository(JobTitle)
    private jobTitleRepo: Repository<JobTitle>,

    @InjectRepository(Industry)
    private industryRepo: Repository<Industry>,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Job)
    private jobRepo: Repository<Job>,

   @InjectRepository(Application)
    private applicationRepo: Repository<Application>

  ) {}

  async getRecruitmentDashboardSummary(getRecruitmentDashboardDto: GetRecruitmentDashboardDto, user: UserRequest){

    const { parentId, orgUnitId, jobTitleId, year, month, week, startDate, endDate } = getRecruitmentDashboardDto;
    let whereJob: FindOptionsWhere<Job> = {};

    let whereApplication: FindOptionsWhere<Application> = {};

    let whereJobByDivision: FindOptionsWhere<Job> = {};

    if( startDate && endDate){
      startDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCHours(23, 59, 59, 999);
      whereJob.createdAt = Between(startDate,endDate);
      whereApplication.createdAt = Between(startDate, endDate);
      whereJobByDivision.createdAt =  Between(startDate, endDate);

    } else if (month) {
        const [start, end] = this.getMonthRange(year, month);
        whereJob.createdAt = Between(start, end);
        whereApplication.createdAt = Between(start, end);
        whereJobByDivision.createdAt = Between(start, end);
    } else if (year) {
        const start = new Date(`${year}-01-01T00:00:00.000Z`);
        const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        whereJob.createdAt = Between(start, end);
        whereApplication.createdAt = Between(start, end);
        whereJobByDivision.createdAt = Between(start, end);
    }


    if (jobTitleId){
      whereJob.jobTitleId = jobTitleId;
    }
    
    if (orgUnitId){
      whereJob.orgUnitId = orgUnitId;

      const orgUnit = await this.orgUnitRepo.findOne({
        where: {id: orgUnitId},
        select: ['id','name', 'parentId']
      })

      if (orgUnit) {
        const listOrgUnit = await this.orgUnitRepo.find({
          where: { type: OrgUnitType.DEPARTMENT.toString() as unknown as OrgUnitType, parentId: orgUnit.parentId },
          select: ['id', 'name']
        })

        const listOrgUnitIds = listOrgUnit.map((item) => item.id);

        whereJobByDivision.orgUnitId = In(listOrgUnitIds)

      }
    }
    else if (parentId) {
      const parent = await this.orgUnitRepo.findOne({
        where: {id: parentId},
        select: ['id', 'type']
      })

      if (parent.type === OrgUnitType.BOARD_OF_DIRECTORS){
        const listOrgUnit = await this.orgUnitRepo.find({
          where: { type: In([OrgUnitType.BOARD_OF_DIRECTORS.toString() , OrgUnitType.DIVISION.toString()])},
          select: ['id','name']
        })

        const listOrgUnitIds = listOrgUnit.map((item) => item.id);

        if (listOrgUnitIds.length > 0) {
          whereJob.orgUnitId = In(listOrgUnitIds);
          whereJobByDivision.orgUnitId = In(listOrgUnitIds);
        }
      } else if ( parent.type === OrgUnitType.DIVISION){
        const listOrgUnit = await this.orgUnitRepo.find({
          where: { type: OrgUnitType.DEPARTMENT.toString() as unknown as OrgUnitType, parentId: parent.id },
          select: ['id', 'name']
        })

        const listOrgUnitIds = listOrgUnit.map((item) => item.id);

        if (listOrgUnitIds.length > 0) {
          whereJob.orgUnitId = In(listOrgUnitIds);
          whereJobByDivision.orgUnitId = In(listOrgUnitIds);
        }
      }
    } 

    whereJob.status = Not(In([JobStatus.REJECTED, JobStatus.PENDING]));
    whereJobByDivision.status = Not(In([JobStatus.REJECTED, JobStatus.PENDING]));

    const [applications, totalApplication] = await this.applicationRepo.findAndCount({
      relations: {job: true},
      where: {
        ...whereApplication,
        job: whereJob
      }
    })

    const platformStatisticCVs = await this.platformStatisticCVs(applications);

    const statusMap: Record<string, number> = applications.reduce(
      (acc, app) => {
        acc[app.status] = (acc[app.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const getCount = (status: ApplicationStatus) => Number(statusMap[status] || 0);

    const totalOnboard = getCount(ApplicationStatus.ONBOARD);
    
    const totalAcceptance = getCount(ApplicationStatus.ACCEPTANCE) + totalOnboard;

    const totalRejected = getCount(ApplicationStatus.REJECTED);

    const totalPassInterview = getCount(ApplicationStatus.OFFERED) + totalAcceptance + totalRejected;

    const totalInterview = getCount(ApplicationStatus.INTERVIEW) + getCount(ApplicationStatus.THANK_LETTER) + totalPassInterview;

    const totalQualifiedCVs = totalApplication - getCount(ApplicationStatus.NOT_QUALIFIED);

    const countRecruitmentByDivision = await this.countRecruitmentByDivision(whereJobByDivision);

    // tính phần trăm
    const qualifiedCVsRate = this.roundTo2((totalQualifiedCVs/totalApplication) * 100);

    const interviewRate = this.roundTo2((totalInterview/totalQualifiedCVs) * 100);

    const passInterviewRate = this.roundTo2((totalPassInterview/totalInterview) * 100);

    const acceptanceRate = this.roundTo2((totalAcceptance/totalPassInterview) * 100);

    const onboardRate =  this.roundTo2((totalOnboard/totalAcceptance) * 100);

    const rate = { qualifiedCVsRate, interviewRate, passInterviewRate, acceptanceRate, onboardRate}

    const total = { totalApplication, totalQualifiedCVs, totalInterview, totalPassInterview, totalAcceptance, totalOnboard}

    return {
      total,
      rate,
      countRecruitmentByDivision,
      platformStatisticCVs
    //  totalQuantity: total.quantity,
    //  totalOnboardCount: total.onboardCount
    }
  }

  formatDate(date: Date): string {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0'); 
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  getWeeksInMonthWithRule34(year: number, month: number): {
    weekNumber: number;
    startDate: Date;
    endDate: Date;
  }[] {
    const result: {
      weekNumber: number;
      startDate: Date;
      endDate: Date;
    }[] = [];

    // JS Date tháng bắt đầu từ 0
    const realMonth = month - 1;

    const firstDayOfMonth = new Date(Date.UTC(year, realMonth, 1));
    const lastDayOfMonth = new Date(Date.UTC(year, realMonth + 1, 0));

    const days: Date[] = [];

    // Push tất cả ngày trong tháng
    for (let d = new Date(firstDayOfMonth); d <= lastDayOfMonth; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Gom ngày thành các tuần tạm
    let tempWeeks: { startDate: Date; endDate: Date; days: Date[] }[] = [];
    let currentWeek: Date[] = [];

    for (const day of days) {
      const dayOfWeek = day.getDay(); // 0: CN, 1: T2, ..., 6: T7

      currentWeek.push(day);

      // Nếu là Chủ nhật hoặc là ngày cuối cùng trong tháng -> kết thúc tuần
      if (dayOfWeek === 0 || day.getTime() === lastDayOfMonth.getTime()) {
        const startDate = currentWeek[0];
        const endDate = currentWeek[currentWeek.length - 1];
        tempWeeks.push({ startDate, endDate, days: [...currentWeek] });
        currentWeek = [];
      }
    }

    // Xử lý tuần đầu (tuần thiếu < 4 ngày -> gộp)
    if (tempWeeks.length > 1 && tempWeeks[0].days.length < 4) {
      tempWeeks[1].days = [...tempWeeks[0].days, ...tempWeeks[1].days];
      tempWeeks[1].startDate = tempWeeks[0].startDate;
      tempWeeks.shift();
    }

    // Xử lý tuần cuối (tuần thiếu < 4 ngày -> gộp)
    const lastIdx = tempWeeks.length - 1;
    if (tempWeeks.length > 1 && tempWeeks[lastIdx].days.length < 4) {
      tempWeeks[lastIdx - 1].days = [...tempWeeks[lastIdx - 1].days, ...tempWeeks[lastIdx].days];
      tempWeeks[lastIdx - 1].endDate = tempWeeks[lastIdx].endDate;
      tempWeeks.pop();
    }

    // Đánh số tuần
    tempWeeks.forEach((week, idx) => {
      result.push({
        weekNumber: idx + 1,
        startDate: new Date(week.startDate),
        endDate: new Date(week.endDate),
      });
    });

    return result;
  }

  getMonthRange(year: number, month: number): [Date, Date] {
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)); 
    const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)); 
    return [start, end];
  }

  async countRecruitmentByDivision(whereJobByDivision: FindOptionsWhere<Job>){

    const [listOrgUnitParent, jobRecruitment] = await Promise.all([
      this.orgUnitRepo.find({
        where: { type : OrgUnitType.DIVISION.toString() as unknown as OrgUnitType},
        select: ['id', 'name']
      }),
      this.jobRepo.find({
        relations: {orgUnit: { parent: true}, jobTitle: true},
        where: whereJobByDivision,
        select: {id: true, quantity: true, onboardCount: true, budget: true, platform: true,  completionDate: true, postedDate: true, jobTitleId: true, jobTitle: { id: true, name: true}, createdAt: true, orgUnitId: true, orgUnit: { id: true, name: true, type: true, parent: { id: true, name: true}}}
      })
    ])

    const averageDuration = await this.averageHiringDuration(jobRecruitment);

    const platformCostStatistics = await this.platformCostStatistics(jobRecruitment);

    const jobMap: Record<string, Job[]> = {};


    for (const item of listOrgUnitParent) {
      for (const job of jobRecruitment) {
        if (
          (job.orgUnit.type === OrgUnitType.DIVISION && job.orgUnitId === item.id) ||
          (job.orgUnit.parent?.id === item.id && job.orgUnit.type === OrgUnitType.DEPARTMENT) || item.id === job.orgUnitId
        ) {
          if (!jobMap[item.id]) {
            jobMap[item.id] = [];
          }
          jobMap[item.id].push(job);
        }
      }
    }

    const result: { parentId: string; parentName: string; totalQuantity: number; totalOnboardCount: number }[] = [];

    for (const [parentId, jobs] of Object.entries(jobMap)) {
      if (jobs.length === 0) continue;

      const totalQuantity = jobs.reduce((sum, job) => sum + (job.quantity || 0), 0);
      const parentName = jobs[0].orgUnit.parent?.name || 'Unknown';
      const totalOnboardCount = jobs.reduce((sum, job) => sum + (job.onboardCount || 0), 0);

      result.push({
        parentId,
        parentName,
        totalQuantity,
        totalOnboardCount
      });
    }

    const total = jobRecruitment.reduce(
      (sum, job) => {
          sum.quantity += job.quantity ?? 0;
          sum.onboardCount += job.onboardCount ?? 0;
          return sum;
      },
      { quantity: 0, onboardCount: 0 }
    );

    return {result, total, averageDuration, platformCostStatistics};
  }

  async averageHiringDuration(listJob: Job[]){

    const now = new Date();

    type GroupedType = {
      jobTitleId: string;
      jobTitleName: string;
      totalOnboard: number;
      totalHoursPassed: number;
      totalHoursCompletedOnly: number;
      avgTime: number;
    };

    const grouped = listJob.reduce<Record<string, GroupedType>>((acc, job) => {
      const key = job.jobTitle.id;

      const postedDate = job.postedDate ?  new Date(job.postedDate) : new Date(job.createdAt);
      const isCompleted = !!job.completionDate;
      const endDate = isCompleted ? new Date(job.completionDate) : now;

      const workDays = this.getWorkDays(postedDate, endDate);

      const workHours = workDays * 8;

      // const daysPassed = Math.ceil((endDate.getTime() - postedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (!acc[key]) {
        acc[key] = {
          jobTitleId: job.jobTitle.id,
          jobTitleName: job.jobTitle.name,
          totalOnboard: 0,
          totalHoursPassed: 0,           // giờ của tất cả job (bao gồm đang làm)
          totalHoursCompletedOnly: 0,    // giờ của job đã hoàn thành
          avgTime: 0
        };
      }
      acc[key].totalOnboard += job.onboardCount || 0;
      acc[key].totalHoursPassed += workHours;
      acc[key].totalHoursCompletedOnly += isCompleted ? workHours : 0;
      return acc;
    }, {});

    const result = Object.values(grouped).map((group: GroupedType) => ({
      ...group,
      avgTime: this.roundTo2(group.totalOnboard ? group.totalHoursPassed / group.totalOnboard : 0),
    }));

    return result;
  }

  async platformStatisticCVs (listApplication: Application[]){
    const result = listApplication.reduce((acc, app) => {
      const key = app.platform;
      if (!acc[key]) {
        acc[key] = {
          platform: key,
          totalApplication: 0,
        };
      }
      acc[key].totalApplication += 1;
      return acc;
    }, {} as Record<string, { platform: string; totalApplication: number }>);

    const grouped = Object.values(result);
    return grouped;
  }

  async platformCostStatistics (listJob: Job[]){
    const result = listJob.reduce((acc, job) => {
      const key = job.platform;
      if (!acc[key]) {
        acc[key] = {
          platform: key,
          totalBudget: 0,
        };
      }
        acc[key].totalBudget += job.budget;
        return acc;
      }, {} as Record<string, { platform: string; totalBudget: number }>);

    const grouped = Object.values(result);
    
    return grouped;
  }
 

  getWorkDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);

    // Reset time để tránh lệch giờ
    current.setHours(0, 0, 0, 0);
    end = new Date(end);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0) { // 0 = Chủ nhật
        count++;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  }

  roundTo2 = (num) => isNaN(num) ? 0:  Math.round(num * 100) / 100;


}
