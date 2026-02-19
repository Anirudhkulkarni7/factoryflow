import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export type Role = "ADMIN" | "MANAGER" | "USER";

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: "varchar" })
  role!: Role;

  @Column("text", { array: true, default: () => "ARRAY[]::text[]" })
  plantIds!: string[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

    @Column({ type: "boolean", default: true })
  active!: boolean;
}
