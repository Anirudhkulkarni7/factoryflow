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

@OneToMany(() => SubmissionAnswer, (a: SubmissionAnswer) => a.submission, { cascade: true })
  answers!: SubmissionAnswer[];

  @CreateDateColumn()
  submittedAt!: Date;
}
