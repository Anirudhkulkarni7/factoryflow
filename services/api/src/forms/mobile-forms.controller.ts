import {
  BadRequestException,
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CreateSubmissionDto } from "./dto/create-submission.dto";



import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentUser } from "../auth/current-user.decorator";
import type { JwtPayload } from "../auth/jwt.strategy";

import { FormsService } from "./forms.service";


@Controller("mobile/forms")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "MANAGER", "USER")
export class MobileFormsController {
  constructor(private readonly forms: FormsService) {}

  @Get()
  listForPlant(
    @CurrentUser() me: JwtPayload,
    @Query("plantId", new ParseUUIDPipe({ version: "4" })) plantId: string,
  ) {
    if (me.role !== "ADMIN" && !(me.plantIds ?? []).includes(plantId)) {
      throw new BadRequestException("Access denied for this plant");
    }
    return this.forms.listPublishedForPlant(plantId);
  }

  @Post("submissions")
createSubmission(@CurrentUser() me: JwtPayload, @Body() dto: CreateSubmissionDto) {
  return this.forms.createSubmission({
    userId: me.sub,
    role: me.role,
    userPlantIds: me.plantIds ?? [],
    templateId: dto.templateId,
    plantId: dto.plantId,
    answers: dto.answers,
  });
}

}
