import { CommonEntity } from 'src/monitoring-auth/auth/common/common.entities';
import { WebsiteAlertStatus } from 'src/monitoring-auth/auth/common/enum/website-alert-status.enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('website')
export class WebsiteEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 255,
  })
  websiteUrl: string;

  @Column({
    type: 'int2',
    nullable: true,
  })
  locationId: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  searchString: string;

  @Column({
    type: 'int2',
    nullable: true,
  })
  delayDurationId: number;

  @Column({
    type: 'int2',
    comment: 'this id is workspaceId',
  })
  groupId: number;

  @Column({
    type: 'int2',
  })
  userId: number;

  @Column({ type: 'json', nullable: true })
  team: string;

  @Column({ type: 'varchar', length: '255', nullable: true })
  uniqueId: string;

  @Column({
    nullable: true,
  })
  lastCheckTime: Date;

  @Column({
    nullable: true,
  })
  lastLoadTime: string;

  @Column({
    type: 'enum',
    enum: WebsiteAlertStatus,
    nullable: true,
  })
  alertStatus: string;

  @Column({
    type: 'int2',
    default: 5,
  })
  occurrences: number;

  @Column({ default: false })
  mailAlertStatus: boolean;
}
