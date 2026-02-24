import "dotenv/config";
import * as bcrypt from "bcrypt";
import { DataSource } from "typeorm";

import { User } from "./entities/user.entity";
import { Plant } from "./entities/plant.entity";

async function main() {
  
  const ds = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    entities: [User, Plant],
  });

  await ds.initialize();

  const email = "admin@factoryflow.local";
  const plainPassword = "admin123";
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const repo = ds.getRepository(User);

  const existing = await repo.findOne({ where: { email } });

  if (existing) {
  existing.password = passwordHash;
  existing.role = "ADMIN";
  existing.plantIds = existing.plantIds ?? [];
  await repo.save(existing);
  console.log("Admin password RESET:", email, "password:", plainPassword);
} else {
  const admin = repo.create({
    name: "FactoryFlow Admin",
    email,
    password: passwordHash,
    role: "ADMIN",
    plantIds: [],
  });

  await repo.save(admin);
  console.log("Admin created:", email, "password:", plainPassword);
}

  await ds.destroy();
}

main().catch((e) => {
  console.error(" Seed failed:", e);
  process.exit(1);
});
