import {
  BadRequestException,
  Body,
  Controller,
  Get,
  ParseUUIDPipe,
  Post,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CreateSubmissionDto } from "./dto/create-submission.dto";
import { ListSubmissionsQueryDto } from "./dto/list-submissions.query";
import { ReviewSubmissionDto } from "./dto/review-submission.dto";




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

@Get("submissions")
listSubmissions(@CurrentUser() me: JwtPayload, @Query() q: ListSubmissionsQueryDto) {
  const status = q.status ?? (me.role === "ADMIN" ? undefined : "SUBMITTED");

  return this.forms.listSubmissions({
    role: me.role,
    userPlantIds: me.plantIds ?? [],
    plantId: q.plantId,
    status,
    q: q.q,
    page: q.page,
    limit: q.limit,
    sortBy: q.sortBy,
    sortDir: q.sortDir,
  });
}

@Get("submissions/mine")
listMine(@CurrentUser() me: JwtPayload, @Query() q: ListSubmissionsQueryDto) {
  return this.forms.listMySubmissions({
    userId: me.sub,
    status: q.status,
  });
}
@Get("submissions/:id")
getSubmission(
  @CurrentUser() me: JwtPayload,
  @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
) {
  return this.forms.getSubmissionById({
    role: me.role,
    userId: me.sub,
    userPlantIds: me.plantIds ?? [],
    submissionId: id,
  });
}



@Get("my-submissions")
listMySubmissions(
  @CurrentUser() me: JwtPayload,
  @Query("status") status?: "SUBMITTED" | "APPROVED" | "REJECTED",
) {
  return this.forms.listMySubmissions({
    userId: me.sub,
    status,
  });
}


@Post("submissions/:id/approve")
@Roles("ADMIN", "MANAGER")
approve(@CurrentUser() me: JwtPayload, @Param("id", ParseUUIDPipe) id: string) {
  return this.forms.approveSubmission({
    submissionId: id,
    reviewerUserId: me.sub,
    role: me.role,
    reviewerPlantIds: me.plantIds ?? [],
  });
}

@Post("submissions/:id/reject")
@Roles("ADMIN", "MANAGER")
reject(
  @CurrentUser() me: JwtPayload,
  @Param("id", ParseUUIDPipe) id: string,
  @Body() dto: ReviewSubmissionDto,
) {
  return this.forms.rejectSubmission({
  submissionId: id,
  reviewerUserId: me.sub,
  role: me.role,
  reviewerPlantIds: me.plantIds ?? [],
  reason: dto.reason ?? "",
});
}




}
