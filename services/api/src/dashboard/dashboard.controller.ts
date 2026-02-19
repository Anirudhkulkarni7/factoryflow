import { Controller, Get, Query, UseGuards } from "@nestjs/common";

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


  @Get("plant-summary")
plantSummary(
  @CurrentUser() me: JwtPayload,
  @Query("plantId") plantId?: string,
  @Query("range") range?: string,
  @Query("from") from?: string,
  @Query("to") to?: string,
) {
  return this.dashboard.getPlantSummary({
    role: me.role,
    userPlantIds: me.plantIds ?? [],
    plantId,
    range,
    from,
    to,
  });
}

@Get("template-summary")
templateSummary(
  @CurrentUser() me: JwtPayload,
  @Query("plantId") plantId?: string,
  @Query("range") range?: string,
  @Query("from") from?: string,
  @Query("to") to?: string,
  @Query("limit") limit?: string,
) {
  return this.dashboard.getTemplateSummary({
    role: me.role,
    userPlantIds: me.plantIds ?? [],
    plantId,
    range,
    from,
    to,
    limit: limit ? Number(limit) : undefined,
  });
}

@Get("trends")
trends(
  @CurrentUser() me: JwtPayload,
  @Query("plantId") plantId?: string,
  @Query("range") range?: string,
  @Query("from") from?: string,
  @Query("to") to?: string,
  @Query("bucket") bucket?: "day" | "week",
) {
  return this.dashboard.getTrends({
    role: me.role,
    userPlantIds: me.plantIds ?? [],
    plantId,
    range,
    from,
    to,
    bucket,
  });
}

@Get("pending-aging")
pendingAging(
  @CurrentUser() me: JwtPayload,
  @Query("plantId") plantId?: string,
) {
  return this.dashboard.getPendingAging({
    role: me.role,
    userPlantIds: me.plantIds ?? [],
    plantId,
  });
}

@Get("top-submitters")
topSubmitters(
  @CurrentUser() me: JwtPayload,
  @Query("plantId") plantId?: string,
  @Query("range") range?: string,
  @Query("from") from?: string,
  @Query("to") to?: string,
  @Query("limit") limit?: string,
) {
  return this.dashboard.getTopSubmitters({
    role: me.role,
    userPlantIds: me.plantIds ?? [],
    plantId,
    range,
    from,
    to,
    limit: limit ? Number(limit) : undefined,
  });
}



}
