import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

const FIELD_TYPES = ["TEXT", "NUMBER", "CHECKBOX", "DROPDOWN", "DATE", "PHOTO"] as const;
type FieldType = (typeof FIELD_TYPES)[number];

class CreateFieldDto {
  @IsString()
  @MinLength(1)
  label!: string;

  @IsIn(FIELD_TYPES)
  type!: FieldType;

  @IsBoolean()
  required!: boolean;

  @IsOptional()
  config?: Record<string, unknown>;
}

export class CreateFormDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  plantIds?: string[];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateFieldDto)
  fields!: CreateFieldDto[];
}
