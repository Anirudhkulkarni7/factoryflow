import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { FormSubmission } from "src/entities/forms/form-submission.entity";

import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { Plant } from "src/entities/plant.entity";
import { FormTemplate } from "src/entities/forms/form-template.entity";

@Module({
  imports: [TypeOrmModule.forFeature([FormSubmission, Plant, FormTemplate])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
