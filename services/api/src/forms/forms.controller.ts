import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Post,
  Patch,
  UseGuards,
} from "@nestjs/common";

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.strategy';

import { CreateFormDto } from './dto/create-form.dto';
import { FormsService } from './forms.service';
import { UpdateFormDto } from "./dto/update-form.dto";
import { ListFormsQueryDto } from "./dto/list-forms.query";



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
list(@Query() q: ListFormsQueryDto) {
  return this.forms.list(q);
}

  @Post(':id/publish')
  publish(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.forms.publish(id);
  }

    @Get(':id')
  getOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.forms.getTemplateById(id);
  }

 


  @Patch(':id')
update(
  @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  @Body() dto: UpdateFormDto,
) {
  return this.forms.updateTemplate({
    id,
    ...dto,
  });
}


@Post(':id/archive')
archive(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
  return this.forms.archiveTemplate(id);
}

  @Post(':id/clone')
  clone(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.forms.cloneTemplate(id);
  }

  
}
