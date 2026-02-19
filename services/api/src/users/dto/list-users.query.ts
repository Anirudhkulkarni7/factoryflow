import { IsIn, IsOptional, IsString, Min } from "class-validator";
import { Transform } from "class-transformer";

export class ListUsersQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(["ADMIN", "MANAGER", "USER"])
  role?: "ADMIN" | "MANAGER" | "USER";

  @IsOptional()
  @IsString()
  plantId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) return undefined;
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  })
  active?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @Min(1)
  limit?: number;
}
