import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Plant } from "src/entities/plant.entity";
import { FormTemplate } from "src/entities/forms/form-template.entity";
import { FormField } from "src/entities/forms/form-field.entity";

import { FormsController } from "./forms.controller";
import { FormsService } from "./forms.service";
import { MobileFormsController } from "./mobile-forms.controller";
import { FormSubmission } from "../entities/forms/form-submission.entity";
import { SubmissionAnswer } from "../entities/forms/submission-answer.entity";


@Module({
  imports: [TypeOrmModule.forFeature([Plant, FormTemplate, FormField,FormSubmission,
SubmissionAnswer,
])],
controllers: [FormsController, MobileFormsController],
  providers: [FormsService],
})
export class FormsModule {}
