import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from "typeorm";
import { Plant } from 'src/entities/plant.entity';
import { FormTemplate } from 'src/entities/forms/form-template.entity';
import { FormField } from 'src/entities/forms/form-field.entity';
import { FormSubmission } from '../entities/forms/form-submission.entity';
import { SubmissionAnswer } from '../entities/forms/submission-answer.entity';

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
    @InjectRepository(FormField) private readonly fields: Repository<FormField>,
    @InjectRepository(Plant) private readonly plants: Repository<Plant>,
    @InjectRepository(FormSubmission)
    private readonly submissions: Repository<FormSubmission>,
    @InjectRepository(SubmissionAnswer)
    private readonly answers: Repository<SubmissionAnswer>,
    private readonly dataSource: DataSource,

  ) {}

  private validateAnswerValue(field: FormField, value: unknown) {
  if (value === undefined) return; // optional field might be omitted
  if (value === null) return; // allow null for non-required fields

  switch (field.type) {
    case "TEXT": {
      if (typeof value !== "string") throw new BadRequestException(`${field.label} must be a string`);
      return;
    }
    case "NUMBER": {
      if (typeof value !== "number" || Number.isNaN(value))
        throw new BadRequestException(`${field.label} must be a number`);
      return;
    }
    case "CHECKBOX": {
      if (typeof value !== "boolean") throw new BadRequestException(`${field.label} must be a boolean`);
      return;
    }
    case "DATE": {
      if (typeof value !== "string") throw new BadRequestException(`${field.label} must be an ISO date string`);
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) throw new BadRequestException(`${field.label} must be a valid date`);
      return;
    }
    case "DROPDOWN": {
      if (typeof value !== "string") throw new BadRequestException(`${field.label} must be a string option`);
      // later we’ll validate allowed options via field.config.options
      return;
    }
    case "PHOTO": {
      if (typeof value !== "string") throw new BadRequestException(`${field.label} must be a file key string`);
      // later: validate it looks like a MinIO object key or uploaded file id
      return;
    }
    default:
      throw new BadRequestException(`Unsupported field type: ${field.type}`);
  }
}


  async create(input: {
    title: string;
    plantIds: string[];
    createdByUserId: string;
    fields: Array<{
      label: string;
      type: string;
      required: boolean;
      config?: Record<string, unknown>;
    }>;
  }) {
    if (input.plantIds.length > 0) {
      const count = await this.plants.count({
        where: { id: In(input.plantIds) },
      });
      if (count !== input.plantIds.length)
        throw new BadRequestException('Invalid plantIds');
    }

    const template = this.templates.create({
      title: input.title,
      plantIds: input.plantIds,
      createdByUserId: input.createdByUserId,
      status: 'DRAFT',
      version: 1,
    });

    const savedTemplate = await this.templates.save(template);

    const fieldEntities = input.fields.map((f, idx) =>
      this.fields.create({
        templateId: savedTemplate.id,
        label: f.label,
        type: f.type as any,
        required: f.required,
        order: idx + 1,
        config: f.config,
      }),
    );

    await this.fields.save(fieldEntities);

    return this.templates.findOne({
      where: { id: savedTemplate.id },
      relations: { fields: true },
    });
  }

  list() {
    return this.templates.find({
      order: { createdAt: 'DESC' },
      relations: { fields: true },
    });
  }

  async publish(id: string) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new BadRequestException('Form not found');

    if (t.status !== 'DRAFT') return t;

    t.status = 'PUBLISHED';
    return this.templates.save(t);
  }

  async listPublishedForPlant(plantId: string) {
    return this.templates
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fields', 'f')
      .where('t.status = :status', { status: 'PUBLISHED' })
      .andWhere(
        '(cardinality(t."plantIds") = 0 OR t."plantIds" @> ARRAY[:plantId]::text[])',
        { plantId },
      )
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('f.order', 'ASC')
      .getMany();
  }
  async createSubmission(input: {
  userId: string;
  role: string;
  userPlantIds: string[];
  templateId: string;
  plantId: string;
  answers: Array<{ fieldId: string; value?: unknown }>;
}) {
  if (input.role !== "ADMIN" && !input.userPlantIds.includes(input.plantId)) {
    throw new BadRequestException("Access denied for this plant");
  }

  const template = await this.templates.findOne({
    where: { id: input.templateId },
    relations: { fields: true },
  });
  if (!template) throw new BadRequestException("Form not found");
  if (template.status !== "PUBLISHED") throw new BadRequestException("Form not published");

  if (template.plantIds.length > 0 && !template.plantIds.includes(input.plantId)) {
    throw new BadRequestException("Form not available for this plant");
  }

  const byFieldId = new Map(template.fields.map((f) => [f.id, f]));
  const providedIds = new Set(input.answers.map((a) => a.fieldId));

  for (const f of template.fields) {
    if (f.required && !providedIds.has(f.id)) {
      throw new BadRequestException(`Missing required field: ${f.label}`);
    }
  }

  for (const a of input.answers) {
  const field = byFieldId.get(a.fieldId);
  if (!field) throw new BadRequestException("Invalid fieldId in answers");
  this.validateAnswerValue(field, a.value);
}
return this.dataSource.transaction(async (tx) => {
  const submissionRepo = tx.getRepository(FormSubmission);
  const answerRepo = tx.getRepository(SubmissionAnswer);

  const submission = submissionRepo.create({
    templateId: template.id,
    templateVersion: template.version,
    plantId: input.plantId,
    submittedByUserId: input.userId,
    status: "SUBMITTED",
  });

  const saved = await submissionRepo.save(submission);

  const answerEntities = input.answers.map((a) =>
    answerRepo.create({
      submission: saved,
      fieldId: a.fieldId,
      value: a.value ?? null,
    }),
  );

  await answerRepo.save(answerEntities);

  return submissionRepo.findOne({
    where: { id: saved.id },
    relations: { answers: true },
  });
});

}

async listSubmissions(input: {
  role: string;
  userPlantIds: string[];
  plantId?: string;
  status?: "SUBMITTED" | "APPROVED" | "REJECTED";
  q?: string;
  page?: number;
  limit?: number;
  sortBy?: "submittedAt" | "reviewedAt" | "status";
  sortDir?: "ASC" | "DESC";
}) {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const sortBy = input.sortBy ?? "submittedAt";
  const sortDir = input.sortDir ?? "DESC";

  const qb = this.submissions
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.answers", "a")
    .leftJoin(FormTemplate, "t", "t.id = s.templateId");

  if (input.status) qb.andWhere("s.status = :status", { status: input.status });

  if (input.q && input.q.trim().length > 0) {
    const term = `%${input.q.trim().toLowerCase()}%`;
    qb.andWhere(
      "(LOWER(t.title) LIKE :term OR LOWER(COALESCE(s.rejectReason, '')) LIKE :term)",
      { term },
    );
  }

  if (input.role === "ADMIN") {
    if (input.plantId) qb.andWhere("s.plantId = :plantId", { plantId: input.plantId });
  } else {
    if (input.plantId) {
      if (!input.userPlantIds.includes(input.plantId)) {
        throw new BadRequestException("Access denied for this plant");
      }
      qb.andWhere("s.plantId = :plantId", { plantId: input.plantId });
    } else {
      qb.andWhere("s.plantId = ANY(:plantIds)", { plantIds: input.userPlantIds });
    }
  }

  qb.orderBy(`s.${sortBy}`, sortDir);

  const [items, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return { items, page, limit, total };
}




async approveSubmission(input: {
  submissionId: string;
  reviewerUserId: string;
  role: string;
  reviewerPlantIds: string[];
}) {
  const s = await this.submissions.findOne({ where: { id: input.submissionId } });
  if (!s) throw new BadRequestException("Submission not found");

  if (input.role !== "ADMIN" && !input.reviewerPlantIds.includes(s.plantId)) {
    throw new BadRequestException("Access denied for this plant");
  }

  if (s.status !== "SUBMITTED") {
    throw new BadRequestException(`Cannot approve a ${s.status} submission`);
  }
s.status = "APPROVED";
s.reviewedByUserId = input.reviewerUserId;
s.reviewedAt = new Date();
s.rejectReason = null;

return this.submissions.save(s);

}

async rejectSubmission(input: {
  submissionId: string;
  reviewerUserId: string;
  role: string;
  reviewerPlantIds: string[];
  reason: string;
}) {
  const s = await this.submissions.findOne({ where: { id: input.submissionId } });
  if (!s) throw new BadRequestException("Submission not found");

  // access control
  if (input.role !== "ADMIN" && !input.reviewerPlantIds.includes(s.plantId)) {
    throw new BadRequestException("Access denied for this plant");
  }

  // state machine: only SUBMITTED can be reviewed
  if (s.status !== "SUBMITTED") {
    throw new BadRequestException(`Cannot reject a ${s.status} submission`);
  }

  const reason = (input.reason ?? "").trim();
  if (!reason) throw new BadRequestException("Reject reason is required");

  s.status = "REJECTED";
  s.reviewedByUserId = input.reviewerUserId;
  s.reviewedAt = new Date();
  s.rejectReason = reason;

  return this.submissions.save(s);
}


async listMySubmissions(input: {
  userId: string;
  status?: "SUBMITTED" | "APPROVED" | "REJECTED";
}) {
  const qb = this.submissions
    .createQueryBuilder("s")
    .leftJoinAndSelect("s.answers", "a")
    .where("s.submittedByUserId = :userId", { userId: input.userId })
    .orderBy("s.submittedAt", "DESC");

  if (input.status) qb.andWhere("s.status = :status", { status: input.status });

  return qb.getMany();
}


async getSubmissionById(input: {
  role: string;
  userId: string;
  userPlantIds: string[];
  submissionId: string;
}) {
  const s = await this.submissions.findOne({
    where: { id: input.submissionId },
    relations: { answers: true },
  });
  if (!s) throw new BadRequestException("Submission not found");

  if (input.role === "ADMIN") return s;

  // USER can only see own submissions
  if (input.role === "USER") {
    if (s.submittedByUserId !== input.userId) {
      throw new BadRequestException("Access denied");
    }
    return s;
  }

  // MANAGER: must belong to plant
  if (!input.userPlantIds.includes(s.plantId)) {
    throw new BadRequestException("Access denied for this plant");
  }

  return s;
}



}
