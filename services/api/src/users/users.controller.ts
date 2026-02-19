import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
  Get,
  Patch,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';

import { CreateManagerDto } from './dto/create-manager.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UsersService } from './users.service';
import { ListUsersQueryDto } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post('managers')
  @Roles('ADMIN')
  createManager(@Body() dto: CreateManagerDto) {
    return this.users.createManager(dto);
  }

  @Post('plants/:plantId/users')
  @Roles('MANAGER')
  createUser(
    @CurrentUser() me: JwtPayload,
    @Param('plantId') plantId: string,
    @Body() dto: CreateUserDto,
  ) {
    return this.users.createUserForPlant(me.sub, plantId, dto);
  }

  @Get()
  @Roles('ADMIN')
  list(@Query() q: ListUsersQueryDto) {
    return this.users.listUsers(q);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.users.updateUser(id, dto);
  }

  @Patch(':id/disable')
  @Roles('ADMIN')
  disable(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.users.setActive(id, false);
  }

  @Patch(':id/enable')
  @Roles('ADMIN')
  enable(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.users.setActive(id, true);
  }
}
