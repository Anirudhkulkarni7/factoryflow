import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FormSubmission } from 'src/entities/forms/form-submission.entity';
import { FormTemplate } from 'src/entities/forms/form-template.entity';
import { Plant } from 'src/entities/plant.entity';

type SubmissionStatus = 'SUBMITTED' | 'APPROVED' | 'REJECTED';
type Bucket = 'day' | 'week';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(FormSubmission)
    private readonly submissions: Repository<FormSubmission>,
    @InjectRepository(Plant)
    private readonly plants: Repository<Plant>,
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
  ) {}

  private resolvePlantFilter(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
  }) {
    const { role, userPlantIds, plantId } = input;

    if (role === 'ADMIN') return { mode: 'ADMIN' as const, plantId };

    // MANAGER: must be within assigned plants
    if (plantId) {
      if (!userPlantIds.includes(plantId)) {
        throw new BadRequestException('Access denied for this plant');
      }
      return { mode: 'ONE' as const, plantIds: [plantId] };
    }

    return { mode: 'MANY' as const, plantIds: userPlantIds };
  }

  private parseDateWindow(input: {
    range?: string;
    from?: string;
    to?: string;
  }) {
    const fromRaw = (input.from ?? '').trim();
    const toRaw = (input.to ?? '').trim();

    // Prefer explicit from/to if present
    if (fromRaw || toRaw) {
      const fromDate = fromRaw ? new Date(fromRaw) : null;
      const toDate = toRaw ? new Date(toRaw) : null;

      if (fromDate && Number.isNaN(fromDate.getTime())) {
        throw new BadRequestException('Invalid from date');
      }
      if (toDate && Number.isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid to date');
      }

      const now = new Date();
      const finalTo = toDate ?? now;
      const finalFrom =
        fromDate ?? new Date(finalTo.getTime() - 30 * 24 * 60 * 60 * 1000);

      return { from: finalFrom, to: finalTo };
    }

    // range fallback
    const range = (input.range ?? '30d').trim().toLowerCase();
    const map: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };

    const days = map[range];
    if (!days)
      throw new BadRequestException('Invalid range. Use 7d, 30d, or 90d');

    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
    return { from: fromDate, to: toDate };
  }

  private applyCommonFilters(
    qb: any,
    input: {
      role: string;
      userPlantIds: string[];
      plantId?: string;
      range?: string;
      from?: string;
      to?: string;
    },
  ) {
    const plantFilter = this.resolvePlantFilter(input);
    const window = this.parseDateWindow({
      range: input.range,
      from: input.from,
      to: input.to,
    });

    qb.andWhere('s.submittedAt >= :from AND s.submittedAt <= :to', {
      from: window.from.toISOString(),
      to: window.to.toISOString(),
    });

    if (plantFilter.mode === 'ADMIN') {
      if (plantFilter.plantId)
        qb.andWhere('s.plantId = :plantId', { plantId: plantFilter.plantId });
    } else {
      qb.andWhere('s.plantId = ANY(:plantIds)', {
        plantIds: plantFilter.plantIds,
      });
    }

    return { plantFilter, window };
  }
  //puranse cards k liye data
  async getSummary(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
  }) {
    const filter = this.resolvePlantFilter(input);

    const qb = this.submissions.createQueryBuilder('s');

    if (filter.mode === 'ADMIN') {
      if (filter.plantId)
        qb.andWhere('s.plantId = :plantId', { plantId: filter.plantId });
    } else {
      qb.andWhere('s.plantId = ANY(:plantIds)', { plantIds: filter.plantIds });
    }

    const rows = await qb
      .select('s.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.status')
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

    // Base query
    const base = this.submissions
      .createQueryBuilder('s')
      .leftJoin(FormTemplate, 't', 't.id = s.templateId')
      .select([
        's.id AS id',
        's.templateId AS templateId',
        's.templateVersion AS templateVersion',
        's.plantId AS plantId',
        's.submittedByUserId AS submittedByUserId',
        's.status AS status',
        's.rejectReason AS rejectReason',
        's.submittedAt AS submittedAt',
        's.reviewedAt AS reviewedAt',
        't.title AS templateTitle',
      ])
      .orderBy('s.submittedAt', 'DESC');

    if (input.status)
      base.andWhere('s.status = :status', { status: input.status });

    if (filter.mode === 'ADMIN') {
      if (filter.plantId)
        base.andWhere('s.plantId = :plantId', { plantId: filter.plantId });
    } else {
      base.andWhere('s.plantId = ANY(:plantIds)', {
        plantIds: filter.plantIds,
      });
    }

    // Items
    const items = await base
      .clone()
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    // Total
    const total = await base
      .clone()
      .select('COUNT(*)', 'cnt')
      .getRawOne<{ cnt: string }>();
    const totalNum = Number(total?.cnt ?? 0);

    return { items, page, limit, total: totalNum };
  }

  async getPlantSummary(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
    range?: string;
    from?: string;
    to?: string;
  }) {
    const qb = this.submissions
      .createQueryBuilder('s')
      .leftJoin(Plant, 'p', 'p.id = s.plantId')
      .select('s.plantId', 'plantId')
      .addSelect('p.name', 'plantName')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN s.status = 'SUBMITTED' THEN 1 ELSE 0 END)",
        'submitted',
      )
      .addSelect(
        "SUM(CASE WHEN s.status = 'APPROVED' THEN 1 ELSE 0 END)",
        'approved',
      )
      .addSelect(
        "SUM(CASE WHEN s.status = 'REJECTED' THEN 1 ELSE 0 END)",
        'rejected',
      )
      .groupBy('s.plantId')
      .addGroupBy('p.name')
      .orderBy('total', 'DESC');

    const { window } = this.applyCommonFilters(qb, input);
    const items = await qb.getRawMany();

    return { from: window.from, to: window.to, items };
  }

  async getTemplateSummary(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
    range?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);

    const qb = this.submissions
      .createQueryBuilder('s')
      .leftJoin(FormTemplate, 't', 't.id = s.templateId')
      .select('s.templateId', 'templateId')
      .addSelect('t.title', 'templateTitle')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN s.status = 'SUBMITTED' THEN 1 ELSE 0 END)",
        'submitted',
      )
      .addSelect(
        "SUM(CASE WHEN s.status = 'APPROVED' THEN 1 ELSE 0 END)",
        'approved',
      )
      .addSelect(
        "SUM(CASE WHEN s.status = 'REJECTED' THEN 1 ELSE 0 END)",
        'rejected',
      )
      .groupBy('s.templateId')
      .addGroupBy('t.title')
      .orderBy('total', 'DESC')
      .limit(limit);

    const { window } = this.applyCommonFilters(qb, input);
    const items = await qb.getRawMany();

    return { from: window.from, to: window.to, items };
  }

  async getTrends(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
    range?: string;
    from?: string;
    to?: string;
    bucket?: Bucket;
  }) {
    const bucket: Bucket = (input.bucket ?? 'day') as Bucket;
    if (bucket !== 'day' && bucket !== 'week') {
      throw new BadRequestException('Invalid bucket. Use day or week');
    }

    const trunc = bucket === 'day' ? 'day' : 'week';

    const qb = this.submissions
      .createQueryBuilder('s')
      .select(`date_trunc('${trunc}', s."submittedAt")`, 'bucket')
      .addSelect('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN s.status = 'SUBMITTED' THEN 1 ELSE 0 END)",
        'submitted',
      )
      .addSelect(
        "SUM(CASE WHEN s.status = 'APPROVED' THEN 1 ELSE 0 END)",
        'approved',
      )
      .addSelect(
        "SUM(CASE WHEN s.status = 'REJECTED' THEN 1 ELSE 0 END)",
        'rejected',
      )
      .groupBy('bucket')
      .orderBy('bucket', 'ASC');

    const { window } = this.applyCommonFilters(qb, input);
    const items = await qb.getRawMany();

    return { from: window.from, to: window.to, bucket, items };
  }

  async getPendingAging(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
  }) {
    const plantFilter = this.resolvePlantFilter(input);

    const qb = this.submissions
      .createQueryBuilder('s')
      .where("s.status = 'SUBMITTED'")
      .select(
        `
        CASE
          WHEN (NOW() - s."submittedAt") <= INTERVAL '24 hours' THEN '0-24h'
          WHEN (NOW() - s."submittedAt") <= INTERVAL '3 days' THEN '1-3d'
          ELSE '>3d'
        END
        `,
        'bucket',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy('bucket')
      .orderBy('count', 'DESC');

    if (plantFilter.mode === 'ADMIN') {
      if (plantFilter.plantId)
        qb.andWhere('s.plantId = :plantId', { plantId: plantFilter.plantId });
    } else {
      qb.andWhere('s.plantId = ANY(:plantIds)', {
        plantIds: plantFilter.plantIds,
      });
    }

    const items = await qb.getRawMany();
    return { items };
  }

  async getTopSubmitters(input: {
    role: string;
    userPlantIds: string[];
    plantId?: string;
    range?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);

    const qb = this.submissions
      .createQueryBuilder('s')
      .select('s.submittedByUserId', 'userId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('s.submittedByUserId')
      .orderBy('count', 'DESC')
      .limit(limit);

    const { window } = this.applyCommonFilters(qb, input);
    const items = await qb.getRawMany();

    return { from: window.from, to: window.to, items };
  }
}
