import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Plant } from "../entities/plant.entity";

@Injectable()
export class PlantsService {
  constructor(
    @InjectRepository(Plant) private readonly plants: Repository<Plant>,
  ) {}

  create(name: string) {
    const plant = this.plants.create({ name });
    return this.plants.save(plant);
  }

  findAll() {
    return this.plants.find({ order: { createdAt: "DESC" } });
  }
}
