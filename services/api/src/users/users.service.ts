import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import * as bcrypt from "bcrypt";

import { User } from "../entities/user.entity";
import { Plant } from "../entities/plant.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Plant) private readonly plants: Repository<Plant>,
  ) {}

  async createManager(input: {
    name: string;
    email: string;
    password: string;
    plantIds: string[];
  }) {
    const exists = await this.users.findOne({ where: { email: input.email } });
    if (exists) throw new BadRequestException("Email already exists");

    const plantCount = await this.plants.count({ where: { id: In(input.plantIds) } });
    if (plantCount !== input.plantIds.length) throw new BadRequestException("Invalid plantIds");

    const passwordHash = await bcrypt.hash(input.password, 10);

    const manager = this.users.create({
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: "MANAGER",
      plantIds: input.plantIds,
    });

    const saved = await this.users.save(manager);
    return this.toSafeUser(saved);
  }

  async createUserForPlant(managerUserId: string, plantId: string, input: { name: string; email: string; password: string }) {
    const manager = await this.users.findOne({ where: { id: managerUserId } });
    if (!manager || manager.role !== "MANAGER") throw new ForbiddenException("Not a manager");

    if (!manager.plantIds?.includes(plantId)) throw new ForbiddenException("Plant not assigned");

    const exists = await this.users.findOne({ where: { email: input.email } });
    if (exists) throw new BadRequestException("Email already exists");

    const plant = await this.plants.findOne({ where: { id: plantId } });
    if (!plant) throw new BadRequestException("Plant not found");

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = this.users.create({
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: "USER",
      plantIds: [plantId],
    });

    const saved = await this.users.save(user);
    return this.toSafeUser(saved);
  }

  private toSafeUser(u: User) {
    return { id: u.id, name: u.name, email: u.email, role: u.role, plantIds: u.plantIds };
  }
}
