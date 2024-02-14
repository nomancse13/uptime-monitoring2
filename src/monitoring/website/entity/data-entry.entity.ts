import { CommonEntity } from 'src/monitoring-auth/auth/common/common.entities';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('websiteDataEntry')
export class WebsiteDataEntryEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({
    type: 'int8',
  })
  websiteId: number;

  @Column({
    type: 'text',
  })
  bodyData: string;
}
