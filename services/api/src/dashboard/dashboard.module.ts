import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { FormSubmission } from "src/entities/forms/form-submission.entity";

import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmission])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
