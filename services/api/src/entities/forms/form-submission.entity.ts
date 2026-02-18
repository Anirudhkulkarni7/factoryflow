import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SubmissionAnswer } from "./submission-answer.entity";

export type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

@Entity()
export class FormSubmission {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  templateId!: string;

  @Column({ type: "int" })
  templateVersion!: number;

  @Column({ type: "uuid" })
  plantId!: string;

  @Column({ type: "uuid" })
  submittedByUserId!: string;

  @Column({ type: "varchar", default: "SUBMITTED" })
  status!: SubmissionStatus;

  @Column({ type: "uuid", nullable: true })
  reviewedByUserId?: string;

  @Column({ type: "timestamp", nullable: true })
  reviewedAt?: Date;

  
@Column({ type: "varchar", nullable: true })
rejectReason: string | null = null;


  @OneToMany(() => SubmissionAnswer, (a: SubmissionAnswer) => a.submission, { cascade: true })
  answers!: SubmissionAnswer[];

  @CreateDateColumn()
  submittedAt!: Date;
}
