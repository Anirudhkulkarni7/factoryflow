import { IsArray, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class SubmissionAnswerDto {
  @IsUUID()
  fieldId!: string;

  value!: unknown;
}

export class CreateSubmissionDto {
  @IsUUID()
  templateId!: string;

  @IsUUID()
  plantId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmissionAnswerDto)
  answers!: SubmissionAnswerDto[];
}
