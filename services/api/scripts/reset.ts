// scripts/reset.ts
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DataSource } from "typeorm";
import { AppModule } from "../src/app.module";

async function main() {
  if (process.env.RESET_DB !== "YES") {
    throw new Error('Refusing to reset DB. Set RESET_DB=YES to proceed.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["log", "error", "warn"],
  });

  try {
    const ds = app.get(DataSource);

    await ds.query('TRUNCATE TABLE "submission_answer" CASCADE;');
    await ds.query('TRUNCATE TABLE "form_submission" CASCADE;');
    await ds.query('TRUNCATE TABLE "form_field" CASCADE;');
    await ds.query('TRUNCATE TABLE "form_template" CASCADE;');
    await ds.query('TRUNCATE TABLE "plant" CASCADE;');
    await ds.query('TRUNCATE TABLE "user" CASCADE;');

    console.log("Reset complete (tables truncated)");
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error("Reset failed:", e);
  process.exit(1);
});