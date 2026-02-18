import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";

class UpdateFormFieldDto {
  @IsString()
  label!: string;

  @IsString()
  type!: string;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  config?: Record<string, unknown>;
}

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  plantIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateFormFieldDto)
  fields?: UpdateFormFieldDto[];
}
