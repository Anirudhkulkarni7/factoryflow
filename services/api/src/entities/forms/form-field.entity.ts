import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { FormTemplate } from "./form-template.entity";

export type FieldType =
  | "TEXT"
  | "NUMBER"
  | "CHECKBOX"
  | "DROPDOWN"
  | "DATE"
  | "PHOTO";

@Entity()
export class FormField {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  templateId!: string;

  @ManyToOne(() => FormTemplate, (t) => t.fields, { onDelete: "CASCADE" })
  template!: FormTemplate;

  @Column()
  label!: string;

  @Column({ type: "varchar" })
  type!: FieldType;

  @Column({ type: "boolean", default: false })
  required!: boolean;

  @Column({ type: "int" })
  order!: number;

  @Column({ type: "jsonb", nullable: true })
  config?: Record<string, unknown>;
}
