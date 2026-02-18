import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { FormField } from "./form-field.entity";

export type FormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

@Entity()
export class FormTemplate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  title!: string;

  @Column({ type: "varchar", default: "DRAFT" })
  status!: FormStatus;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ type: "uuid" })
  createdByUserId!: string;

  @Column("text", { array: true, default: () => "ARRAY[]::text[]" })
  plantIds!: string[];

@OneToMany(() => FormField, (f) => f.template)
fields!: FormField[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
