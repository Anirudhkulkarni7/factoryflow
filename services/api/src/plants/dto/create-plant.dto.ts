import { IsString, MinLength } from "class-validator";

export class CreatePlantDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
