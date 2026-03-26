import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Plant } from '../entities/plant.entity';
import { PlantsController } from './plants.controller';
import { PlantsService } from './plants.service';
import { MobilePlantsController } from './mobile-plants.controller';
@Module({
  imports: [TypeOrmModule.forFeature([Plant])],
  controllers: [PlantsController, MobilePlantsController],
  providers: [PlantsService],
})
export class PlantsModule {}
