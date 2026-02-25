import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";

import { AppModule } from "../src/app.module";
import { User } from "../src/entities/user.entity";
import { Plant } from "../src/entities/plant.entity";
import { FormTemplatesService } from "../src/forms/form-templates.service";

async function upsertUser(
  users: Repository<User>,
  input: {
    name: string;
    email: string;
    passwordPlain: string;
    role: "ADMIN" | "MANAGER" | "USER";
    plantIds: string[];
  },
) {
  const existing = await users.findOne({ where: { email: input.email } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(input.passwordPlain, 10);

  const created = users.create();
  created.name = input.name;
  created.email = input.email;
  created.password = passwordHash;
  created.role = input.role;
  created.plantIds = input.plantIds;
  created.active = true;

  return users.save(created);
}

async function upsertPlant(plants: Repository<Plant>, name: string): Promise<Plant> {
  const existing = await plants.findOne({ where: { name } as any });
  if (existing) return existing;

  const created = plants.create();
  (created as any).name = name;

  return plants.save(created);
}

async function ensurePublishedDemoForm(
  templatesSvc: FormTemplatesService,
  input: { title: string; plantIds: string[]; createdByUserId: string },
) {
  const list = await templatesSvc.list({ q: input.title, page: 1, limit: 50 });
  const alreadyPublished = (list.items ?? []).some(
    (t) => t.title === input.title && t.status === "PUBLISHED",
  );
  if (alreadyPublished) return;

  const created = await templatesSvc.create({
    title: input.title,
    plantIds: input.plantIds,
    createdByUserId: input.createdByUserId,
    fields: [
      { label: "Shift", type: "DROPDOWN", required: true, config: { options: ["A", "B", "C"] } },
      { label: "Supervisor", type: "TEXT", required: true },
      { label: "Temperature", type: "NUMBER", required: false },
      { label: "Helmet worn", type: "CHECKBOX", required: true },
      { label: "Work date", type: "DATE", required: true },
      { label: "Photo proof", type: "PHOTO", required: false },
    ],
  });

  await templatesSvc.publish(created!.id);
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  try {
    const users = app.get<Repository<User>>(getRepositoryToken(User));
    const plants = app.get<Repository<Plant>>(getRepositoryToken(Plant));
    const templatesSvc = app.get(FormTemplatesService);

    const plant = await upsertPlant(plants, "Plant A");

    const admin = await upsertUser(users, {
      name: "Admin",
      email: "admin@factoryflow.local",
      passwordPlain: "admin123",
      role: "ADMIN",
      plantIds: [],
    });

    const manager = await upsertUser(users, {
      name: "Manager 1",
      email: "manager1@factoryflow.local",
      passwordPlain: "manager123",
      role: "MANAGER",
      plantIds: [plant.id],
    });

    const user = await upsertUser(users, {
      name: "User 1",
      email: "user1@factoryflow.local",
      passwordPlain: "user123",
      role: "USER",
      plantIds: [plant.id],
    });

    await ensurePublishedDemoForm(templatesSvc, {
      title: "Demo Safety Checklist",
      plantIds: [plant.id],
      createdByUserId: admin.id,
    });

    console.log("Seed complete");
    console.log("Plant:", plant.id, (plant as any).name);
    console.log("Admin:", admin.email, "(password only set if created: admin123)");
    console.log("Manager:", manager.email, "manager123");
    console.log("User:", user.email, "user123");
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});