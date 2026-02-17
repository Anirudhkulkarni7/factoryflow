import { ArrayNotEmpty, IsArray, IsEmail, IsString, MinLength } from "class-validator";

export class CreateManagerDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsArray()
  @ArrayNotEmpty()
  plantIds!: string[];
}
