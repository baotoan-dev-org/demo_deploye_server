import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { RefreshTokenStatus } from '../auth.enum';
import { User } from 'src/modules/user/entities/user.entity';
import { BaseEntity } from 'src/common/entities/base.entity';

@Entity()
export class RefreshToken extends BaseEntity {
  @Column({ type: 'uuid', length: 36 })
  userId: string;
  @ManyToOne(() => User, (e) => e.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'text' })
  refreshToken: string;

  @Column({ type: 'enum', enum: RefreshTokenStatus, default: RefreshTokenStatus.UNUSED })
  status: RefreshTokenStatus;
}
