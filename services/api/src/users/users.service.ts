import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../entities/user.entity';
import { Plant } from '../entities/plant.entity';

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
    if (exists) throw new BadRequestException('Email already exists');

    const plantCount = await this.plants.count({
      where: { id: In(input.plantIds) },
    });
    if (plantCount !== input.plantIds.length)
      throw new BadRequestException('Invalid plantIds');

    const passwordHash = await bcrypt.hash(input.password, 10);

    const manager = this.users.create({
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: 'MANAGER',
      plantIds: input.plantIds,
    });

    const saved = await this.users.save(manager);
    return this.toSafeUser(saved);
  }

  async createUserForPlant(
    managerUserId: string,
    plantId: string,
    input: { name: string; email: string; password: string },
  ) {
    const manager = await this.users.findOne({ where: { id: managerUserId } });
    if (!manager || manager.role !== 'MANAGER')
      throw new ForbiddenException('Not a manager');

    if (!manager.plantIds?.includes(plantId))
      throw new ForbiddenException('Plant not assigned');

    const exists = await this.users.findOne({ where: { email: input.email } });
    if (exists) throw new BadRequestException('Email already exists');

    const plant = await this.plants.findOne({ where: { id: plantId } });
    if (!plant) throw new BadRequestException('Plant not found');

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = this.users.create({
      name: input.name,
      email: input.email,
      password: passwordHash,
      role: 'USER',
      plantIds: [plantId],
    });

    const saved = await this.users.save(user);
    return this.toSafeUser(saved);
  }

  private toSafeUser(u: User) {
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      plantIds: u.plantIds,
      active: (u as any).active ?? true,
    };
  }
  async listUsers(input: {
    q?: string;
    role?: 'ADMIN' | 'MANAGER' | 'USER';
    plantId?: string;
    active?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? 1;
    const limit = Math.min(input.limit ?? 20, 100);

    const qb = this.users
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC');

    if (input.role) qb.andWhere('u.role = :role', { role: input.role });

    if (typeof input.active === 'boolean') {
      qb.andWhere('u.active = :active', { active: input.active });
    }

    if (input.plantId) {
      qb.andWhere(':plantId = ANY(u.plantIds)', { plantId: input.plantId });
    }

    if (input.q && input.q.trim().length > 0) {
      const term = `%${input.q.trim().toLowerCase()}%`;
      qb.andWhere('(LOWER(u.name) LIKE :term OR LOWER(u.email) LIKE :term)', {
        term,
      });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((u) => this.toSafeUser(u)),
      page,
      limit,
      total,
    };
  }

  async updateUser(
    id: string,
    input: {
      name?: string;
      email?: string;
      role?: 'ADMIN' | 'MANAGER' | 'USER';
      plantIds?: string[];
      active?: boolean;
    },
  ) {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new BadRequestException('User not found');

    // email unique check if changed
    if (input.email && input.email !== u.email) {
      const exists = await this.users.findOne({
        where: { email: input.email },
      });
      if (exists) throw new BadRequestException('Email already exists');
    }

    // validate plantIds if present
    if (input.plantIds) {
      const plantCount = await this.plants.count({
        where: { id: In(input.plantIds) },
      });
      if (plantCount !== input.plantIds.length) {
        throw new BadRequestException('Invalid plantIds');
      }
    }

    if (typeof input.name === 'string') u.name = input.name;
    if (typeof input.email === 'string') u.email = input.email;
    if (typeof input.role === 'string') u.role = input.role;
    if (Array.isArray(input.plantIds)) u.plantIds = input.plantIds;
    if (typeof input.active === 'boolean') (u as any).active = input.active; // if active field exists

    const saved = await this.users.save(u);
    return this.toSafeUser(saved);
  }

  async setActive(id: string, active: boolean) {
    const u = await this.users.findOne({ where: { id } });
    if (!u) throw new BadRequestException('User not found');

    (u as any).active = active; // requires active column
    const saved = await this.users.save(u);
    return this.toSafeUser(saved);
  }
}
