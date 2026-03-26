import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { PlantsService } from "./plants.service";

@Controller("mobile/plants")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "MANAGER", "USER")
export class MobilePlantsController {
  constructor(private readonly plants: PlantsService) {}

  @Get()
  async list(@Req() req: any) {
    const role = req.user?.role;
    const plantIds: string[] = Array.isArray(req.user?.plantIds)
      ? req.user.plantIds
      : [];

    // Admin can see all
    if (role === "ADMIN") return this.plants.findAll();

    // Manager/User only see assigned plants
    return this.plants.findByIds(plantIds);
  }
}