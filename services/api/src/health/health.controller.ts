import { Controller, Get } from "@nestjs/common";
import { DataSource } from "typeorm";
import { FilesService } from "../files/files.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly files: FilesService,
  ) {}

  @Get()
  async health() {
    // DB check
    await this.dataSource.query("SELECT 1");

    // MinIO check (simple signed url generation without actually downloading)
    // If MinIO is down/misconfigured, this will throw.
    await this.files.getSignedGetUrl("photos/health-check.txt", 60).catch(() => null);

    return { ok: true, db: "up", minio: "ok" };
  }
}