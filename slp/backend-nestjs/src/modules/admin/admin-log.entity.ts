import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../user/user.entity";

@Entity("admin_log")
export class AdminLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "admin_id" })
  adminId: number;

  @Column()
  action: string;

  @Column({ name: "target_type", type: "varchar", nullable: true })
  targetType: string | null;

  @Column({ name: "target_id", type: "integer", nullable: true })
  targetId: number | null;

  @Column({ type: "jsonb", nullable: true })
  details: any;

  @Column({
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: "admin_id" })
  admin: User;
}
