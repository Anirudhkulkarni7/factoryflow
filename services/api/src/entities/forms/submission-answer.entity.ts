import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FormSubmission } from "./form-submission.entity";

@Entity()
export class SubmissionAnswer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => FormSubmission, (s) => s.answers, { onDelete: "CASCADE" })
  submission!: FormSubmission;

  @Column({ type: "uuid" })
  fieldId!: string;

  @Column({ type: "jsonb" })
  value!: unknown;
}
