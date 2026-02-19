import { IsArray, IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;//optional rakahe.
  

  @IsOptional()
  @IsIn(["ADMIN", "MANAGER", "USER"])
  role?: "ADMIN" | "MANAGER" | "USER";

  @IsOptional()
  @IsArray()
  plantIds?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
