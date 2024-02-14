import { CommonEntity } from 'src/monitoring-auth/auth/common/common.entities';
import { AlertTypeEnum } from 'src/monitoring-auth/auth/common/enum/alert-type.enum';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('website-resolve')
export class WebsiteResolveEntity extends CommonEntity {
  @PrimaryGeneratedColumn({
    type: 'int8',
    comment: 'primary id for the table',
  })
  id: number;

  @Column({
    type: 'text',
    nullable: true,
  })
  message: string;

  //   @Column({
  //     type: 'text',
  //     nullable: true,
  //   })
  //   comparison: string;

  @Column({
    type: 'int2',
  })
  websiteId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  comparisonLimit: string;

  @Column({
    type: 'enum',
    enum: AlertTypeEnum,
    nullable: true,
  })
  type: string;

  @Column({
    type: 'int2',
    nullable: true,
  })
  resloveStatus: number;
}
