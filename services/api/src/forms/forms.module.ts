import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Plant } from "src/entities/plant.entity";
import { FormTemplate } from "src/entities/forms/form-template.entity";
import { FormField } from "src/entities/forms/form-field.entity";

import { FormsController } from "./forms.controller";
import { FormsService } from "./forms.service";

@Module({
  imports: [TypeOrmModule.forFeature([Plant, FormTemplate, FormField])],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
