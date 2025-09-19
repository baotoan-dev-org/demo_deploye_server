import { BaseEntity } from '@/common/entities/base.entity';
import { Entity, Column } from 'typeorm';

@Entity({
  comment: 'Mapping OrgUnit với Division và Department',
})
export class OrgUnitDivisionDepartment extends BaseEntity {
  @Column({ type: 'uuid', length: 36, comment: 'OrgUnit hiện tại' })
  orgUnitId: string;

  @Column({ type: 'uuid', length: 36, nullable: true, comment: 'Division của OrgUnit' })
  divisionId: string;

  @Column({ type: 'uuid', length: 36, nullable: true, comment: 'Department của OrgUnit' })
  departmentId: string;
}
