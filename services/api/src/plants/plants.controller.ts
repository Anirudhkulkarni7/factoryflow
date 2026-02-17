import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Plant } from "../entities/plant.entity";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

import { CreatePlantDto } from "./dto/create-plant.dto";
import { PlantsService } from "./plants.service";

@Controller("plants")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class PlantsController {
  constructor(private readonly plants: PlantsService) {}

  @Post()
  create(@Body() dto: CreatePlantDto) {
    return this.plants.create(dto.name);
  }

  @Get()
  findAll() {
    return this.plants.findAll();
  }
}
