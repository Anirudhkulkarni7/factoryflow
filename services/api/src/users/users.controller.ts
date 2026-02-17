import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";

import { CreateManagerDto } from "./dto/create-manager.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post("managers")
  @Roles("ADMIN")
  createManager(@Body() dto: CreateManagerDto) {
    return this.users.createManager(dto);
  }

  @Post("plants/:plantId/users")
  @Roles("MANAGER")
  createUser(
    @CurrentUser() me: JwtPayload,
    @Param("plantId") plantId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.users.createUserForPlant(me.sub, plantId, dto);
  }
}
