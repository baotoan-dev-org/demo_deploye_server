import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { ProjectTask } from '@/modules/project-task/entities/project-task.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity({ comment: 'Lưu lịch sử phân công. Mỗi lần phân công / thay thế sẽ tạo ra 1 record mới' })
export class ProjectTaskAssignee extends BaseEntity {
  @Column()
  type: number; //   1. Ban Giám đốc, 3. Khối, 5. Bộ phận, 7. Nhóm, 9. Người dùng

  @Column({ type: 'datetime', nullable: true })
  assignedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  unassignedAt: Date;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ nullable: true })
  progressWhenUnassigned: number;

  @Column({
    type: 'uuid',
    length: 36,
    comment: 'User này có thể là người đứng đầu hoặc trong org_unit',
    nullable: true,
  })
  userId: string;
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid', length: 36 })
  projectTaskId: string;
  @ManyToOne(() => ProjectTask, (e) => e.projectTaskAssignees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectTaskId' })
  projectTask: ProjectTask;

  @Column({
    type: 'uuid',
    length: 36,
    comment: 'Lưu lại tại thời điểm user được gán vào đây thuộc đơn vị nào',
    nullable: true,
  })
  orgUnitId: string;
  @ManyToOne(() => OrgUnit, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgUnitId' })
  orgUnit: OrgUnit;
}
