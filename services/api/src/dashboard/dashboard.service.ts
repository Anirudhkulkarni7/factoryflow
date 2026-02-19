import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { FormSubmission } from "src/entities/forms/form-submission.entity";
import { FormTemplate } from "src/entities/forms/form-template.entity";

type SubmissionStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(FormSubmission)
    private readonly submissions: Repository<FormSubmission>,
  ) {}

  private resolvePlantFilter(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
  }) {
    const { role, userPlantIds, plantId } = input;

    if (role === "ADMIN") {
      return { mode: "ADMIN" as const, plantId };
    }

    // MANAGER: must be within assigned plants
    if (plantId) {
      if (!userPlantIds.includes(plantId)) {
        throw new BadRequestException("Access denied for this plant");
      }
      return { mode: "ONE" as const, plantIds: [plantId] };
    }

    return { mode: "MANY" as const, plantIds: userPlantIds };
  }

  async getSummary(input: { role: string; userPlantIds: string[]; plantId?: string }) {
    const filter = this.resolvePlantFilter(input);

    const qb = this.submissions.createQueryBuilder("s");

    if (filter.mode === "ADMIN") {
      if (filter.plantId) qb.andWhere("s.plantId = :plantId", { plantId: filter.plantId });
    } else {
      qb.andWhere("s.plantId = ANY(:plantIds)", { plantIds: filter.plantIds });
    }

    // counts by status in one query
    const rows = await qb
      .select("s.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("s.status")
      .getRawMany<{ status: SubmissionStatus; count: string }>();

    const counts = { SUBMITTED: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of rows) counts[r.status] = Number(r.count);

    return {
      total: counts.SUBMITTED + counts.APPROVED + counts.REJECTED,
      byStatus: counts,
    };
  }

  async getRecentSubmissions(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
    status?: SubmissionStatus;
    page?: number;
    limit?: number;
  }) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;

    const filter = this.resolvePlantFilter(input);

    const qb = this.submissions
      .createQueryBuilder("s")
      .leftJoin(FormTemplate, "t", "t.id = s.templateId")
      .select([
        "s.id AS id",
        "s.templateId AS templateId",
        "s.templateVersion AS templateVersion",
        "s.plantId AS plantId",
        "s.submittedByUserId AS submittedByUserId",
        "s.status AS status",
        "s.rejectReason AS rejectReason",
        "s.submittedAt AS submittedAt",
        "s.reviewedAt AS reviewedAt",
        "t.title AS templateTitle",
      ])
      .orderBy("s.submittedAt", "DESC");

    if (input.status) qb.andWhere("s.status = :status", { status: input.status });

    if (filter.mode === "ADMIN") {
      if (filter.plantId) qb.andWhere("s.plantId = :plantId", { plantId: filter.plantId });
    } else {
      qb.andWhere("s.plantId = ANY(:plantIds)", { plantIds: filter.plantIds });
    }

    const [items, total] = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawAndEntities()
      .then(async () => {
        // TypeORM annoyance: easier to use getRawMany + getCount
        const items = await qb.offset((page - 1) * limit).limit(limit).getRawMany();
        const total = await qb.offset(undefined as any).limit(undefined as any).getCount();
        return [items, total] as const;
      });

    return { items, page, limit, total };
  }
}
