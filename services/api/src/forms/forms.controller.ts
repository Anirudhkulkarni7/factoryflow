import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';

import { CreateFormDto } from './dto/create-form.dto';
import { FormsService } from './forms.service';

@Controller('forms')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FormsController {
  constructor(private readonly forms: FormsService) {}

  @Post()
  create(@CurrentUser() me: JwtPayload, @Body() dto: CreateFormDto) {
    return this.forms.create({
      title: dto.title,
      plantIds: dto.plantIds ?? [],
      createdByUserId: me.sub,
      fields: dto.fields,
    });
  }

  @Get()
  list() {
    return this.forms.list();
  }

  @Post(':id/publish')
  publish(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.forms.publish(id);
  }
}
