import { IsOptional, IsString, MaxLength,MinLength } from "class-validator";

export class ReviewSubmissionDto {
  @IsOptional()
  @IsString()
    @MinLength(1)

  @MaxLength(300)
  reason?: string;
}
