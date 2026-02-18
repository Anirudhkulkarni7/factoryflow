import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

export class ListSubmissionsQueryDto {
  @IsOptional()
  @IsUUID()
  plantId?: string;

  @IsOptional()
  @IsIn(["SUBMITTED", "APPROVED", "REJECTED"])
  status?: "SUBMITTED" | "APPROVED" | "REJECTED";

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(["submittedAt", "reviewedAt", "status"])
  sortBy?: "submittedAt" | "reviewedAt" | "status";

  @IsOptional()
  @IsIn(["ASC", "DESC"])
  sortDir?: "ASC" | "DESC";
}
