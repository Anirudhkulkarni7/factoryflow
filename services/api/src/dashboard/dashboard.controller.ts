import { Controller, Get, Query, UseGuards , ParseUUIDPipe } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";
import { DashboardService } from "./dashboard.service";


@Controller("dashboard")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "MANAGER")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get("summary")
  summary(
    @CurrentUser() me: JwtPayload,
    @Query("plantId") plantId?: string,
  ) {
    return this.dashboard.getSummary({
      role: me.role,
      userPlantIds: me.plantIds ?? [],
      plantId,
    });
  }

  @Get("recent-submissions")
  recent(
    @CurrentUser() me: JwtPayload,
    @Query("plantId") plantId?: string,
    @Query("status") status?: "SUBMITTED" | "APPROVED" | "REJECTED",
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.dashboard.getRecentSubmissions({
      role: me.role,
      userPlantIds: me.plantIds ?? [],
      plantId,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
