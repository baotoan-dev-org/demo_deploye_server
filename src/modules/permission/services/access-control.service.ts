import { UserRequest } from "@/common/interfaces/user-request.type";
import { OrgUnit } from "@/modules/org-unit/entities/org-unit.entity";
import { OrgUnitType } from "@/modules/org-unit/org-unit.enum";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Like, Repository } from "typeorm";

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: Repository<OrgUnit>,
  ) {}

  async canAccessHRFeatures(user: UserRequest): Promise<boolean> {
    const hrBlock = await this.orgUnitRepo.findOne({
      where: { type: OrgUnitType.DIVISION, name: 'Khối nhân sự' },
      relations: ['manager'],
    });

    if (!hrBlock) {
      const hrDepartment = await this.orgUnitRepo.findOne({
        where: { type: OrgUnitType.DEPARTMENT, name: Like('%nhân sự%') },
        relations: ['manager'],
      });
      return hrDepartment?.managerId === user.id;
    }

    if (hrBlock.managerId === user.id) return true;

    if (!hrBlock.managerId) {
      const hrDepartment = await this.orgUnitRepo.findOne({
        where: { parentId: hrBlock.id, type: OrgUnitType.DEPARTMENT, name: Like('%nhân sự%') },
        relations: ['manager'],
      });

      return hrDepartment?.managerId === user.id;
    }

    return false;
  }
}
