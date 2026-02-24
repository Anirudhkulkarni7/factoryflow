import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, In } from 'typeorm';

import { FormTemplate } from 'src/entities/forms/form-template.entity';
import { FormSubmission } from 'src/entities/forms/form-submission.entity';
import { SubmissionAnswer } from 'src/entities/forms/submission-answer.entity';
import { FormField } from 'src/entities/forms/form-field.entity';
import { AnswerValidationService } from './answer-validation.service';

@Injectable()
export class FormSubmissionsService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
    @InjectRepository(FormField)
    private readonly fields: Repository<FormField>,
    @InjectRepository(FormSubmission)
    private readonly submissions: Repository<FormSubmission>,
    private readonly dataSource: DataSource,
    private readonly answerValidation: AnswerValidationService,
  ) {}

  async createSubmission(input: {
    userId: string;
    role: string;
    userPlantIds: string[];
    templateId: string;
    plantId: string;
    answers: Array<{ fieldId: string; value?: unknown }>;
  }) {
    if (input.role !== 'ADMIN' && !input.userPlantIds.includes(input.plantId)) {
      throw new BadRequestException('Access denied for this plant');
    }

    const template = await this.templates.findOne({
      where: { id: input.templateId },
      relations: { fields: true },
    });
    if (!template) throw new BadRequestException('Form not found');
    if (template.status !== 'PUBLISHED') {
      throw new BadRequestException('Form not published');
    }

    if (
      template.plantIds.length > 0 &&
      !template.plantIds.includes(input.plantId)
    ) {
      throw new BadRequestException('Form not available for this plant');
    }

    const byFieldId = new Map((template.fields ?? []).map((f) => [f.id, f]));
    const providedIds = new Set(input.answers.map((a) => a.fieldId));

    for (const f of template.fields ?? []) {
      if (f.required && !providedIds.has(f.id)) {
        throw new BadRequestException(`Missing required field: ${f.label}`);
      }
    }

    for (const a of input.answers) {
      const field = byFieldId.get(a.fieldId);
      if (!field) throw new BadRequestException('Invalid fieldId in answers');
      this.answerValidation.validate(field, a.value);
    }

    return this.dataSource.transaction(async (tx) => {
      const submissionRepo = tx.getRepository(FormSubmission);
      const answerRepo = tx.getRepository(SubmissionAnswer);

      const submission = submissionRepo.create({
        templateId: template.id,
        templateVersion: template.version,
        plantId: input.plantId,
        submittedByUserId: input.userId,
        status: 'SUBMITTED',
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
    status?: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
    q?: string;
    page?: number;
    limit?: number;
    sortBy?: 'submittedAt' | 'reviewedAt' | 'status';
    sortDir?: 'ASC' | 'DESC';
  }) {
    const page = input.page ?? 1;
    const limit = input.limit ?? 20;
    const sortBy = input.sortBy ?? 'submittedAt';
    const sortDir = input.sortDir ?? 'DESC';

    const qb = this.submissions
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.answers', 'a')
      .leftJoin(FormTemplate, 't', 't.id = s.templateId');

    if (input.status)
      qb.andWhere('s.status = :status', { status: input.status });

    if (input.q && input.q.trim().length > 0) {
      const term = `%${input.q.trim().toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(t.title) LIKE :term OR LOWER(COALESCE(s.rejectReason, '')) LIKE :term)",
        { term },
      );
    }

    if (input.role === 'ADMIN') {
      if (input.plantId) {
        qb.andWhere('s.plantId = :plantId', { plantId: input.plantId });
      }
    } else if (input.plantId) {
      if (!input.userPlantIds.includes(input.plantId)) {
        throw new BadRequestException('Access denied for this plant');
      }
      qb.andWhere('s.plantId = :plantId', { plantId: input.plantId });
    } else {
      qb.andWhere('s.plantId = ANY(:plantIds)', {
        plantIds: input.userPlantIds,
      });
    }

    qb.orderBy(`s.${sortBy}`, sortDir);

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const templateIds = Array.from(new Set(rows.map((s) => s.templateId)));

    const pairs = Array.from(
      new Map(
        rows.map((s) => [`${s.templateId}:${s.templateVersion}`, s]),
      ).values(),
    );

    const templates = pairs.length
      ? await this.templates
          .createQueryBuilder('t')
          .where(
            pairs
              .map((_, i) => `(t.id = :id${i} AND t.version = :v${i})`)
              .join(' OR '),
            Object.fromEntries(
              pairs.flatMap((s, i) => [
                [`id${i}`, s.templateId],
                [`v${i}`, s.templateVersion],
              ]),
            ),
          )
          .getMany()
      : [];

    const templateByKey = new Map(
      templates.map((t) => [
        `${t.id}:${t.version}`,
        { id: t.id, title: t.title, version: t.version, familyId: t.familyId },
      ]),
    );

    const fields = templateIds.length
      ? await this.fields.find({
          where: { templateId: In(templateIds) },
          order: { order: 'ASC' },
        })
      : [];

    const fieldById = new Map(
      fields.map((f) => [
        f.id,
        {
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          order: f.order,
          config: f.config ?? null,
        },
      ]),
    );

    const items = rows.map((s) => ({
      id: s.id,
      templateId: s.templateId,
      templateVersion: s.templateVersion,
      plantId: s.plantId,
      submittedByUserId: s.submittedByUserId,
      status: s.status,
      rejectReason: s.rejectReason,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt ?? null,
      reviewedByUserId: s.reviewedByUserId ?? null,

      template:
        templateByKey.get(`${s.templateId}:${s.templateVersion}`) ?? null,

      answers: (s.answers ?? []).map((a) => ({
        id: a.id,
        fieldId: a.fieldId,
        value: a.value,
        field: fieldById.get(a.fieldId) ?? null,
      })),
    }));

    return { items, page, limit, total };
  }

  private async enrichSubmissions(rows: FormSubmission[]) {
    if (!rows.length) return [];

    // unique templateId + templateVersion pairs
    const pairs = Array.from(
      new Map(
        rows.map((s) => [`${s.templateId}:${s.templateVersion}`, s]),
      ).values(),
    );

    const templateIds = Array.from(new Set(rows.map((s) => s.templateId)));

    const templates = pairs.length
      ? await this.templates
          .createQueryBuilder('t')
          .where(
            pairs
              .map((_, i) => `(t.id = :id${i} AND t.version = :v${i})`)
              .join(' OR '),
            Object.fromEntries(
              pairs.flatMap((s, i) => [
                [`id${i}`, s.templateId],
                [`v${i}`, s.templateVersion],
              ]),
            ),
          )
          .getMany()
      : [];

    const templateByKey = new Map(
      templates.map((t) => [
        `${t.id}:${t.version}`,
        { id: t.id, title: t.title, version: t.version, familyId: t.familyId },
      ]),
    );

    const fields = templateIds.length
      ? await this.fields.find({
          where: { templateId: In(templateIds) },
          order: { order: 'ASC' },
        })
      : [];

    const fieldById = new Map(
      fields.map((f) => [
        f.id,
        {
          id: f.id,
          label: f.label,
          type: f.type,
          required: f.required,
          order: f.order,
          config: f.config ?? null,
        },
      ]),
    );

    return rows.map((s) => {
      const answers = (s.answers ?? []).map((a) => ({
        id: a.id,
        fieldId: a.fieldId,
        value: a.value,
        field: fieldById.get(a.fieldId) ?? null,
      }));

      // optional: keep answers in field order (nice for UI)
      answers.sort((x, y) => (x.field?.order ?? 0) - (y.field?.order ?? 0));

      return {
        id: s.id,
        templateId: s.templateId,
        templateVersion: s.templateVersion,
        plantId: s.plantId,
        submittedByUserId: s.submittedByUserId,
        status: s.status,
        rejectReason: s.rejectReason,
        submittedAt: s.submittedAt,
        reviewedAt: s.reviewedAt ?? null,
        reviewedByUserId: s.reviewedByUserId ?? null,

        template:
          templateByKey.get(`${s.templateId}:${s.templateVersion}`) ?? null,

        answers,
      };
    });
  }

  async listMySubmissions(input: {
    userId: string;
    status?: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  }) {
    const qb = this.submissions
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.answers', 'a')
      .where('s.submittedByUserId = :userId', { userId: input.userId })
      .orderBy('s.submittedAt', 'DESC');

    if (input.status)
      qb.andWhere('s.status = :status', { status: input.status });

    const rows = await qb.getMany();
    return this.enrichSubmissions(rows);
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
    if (!s) throw new BadRequestException('Submission not found');

    // access control
    if (input.role !== 'ADMIN') {
      if (input.role === 'USER') {
        if (s.submittedByUserId !== input.userId) {
          throw new BadRequestException('Access denied');
        }
      } else {
        if (!input.userPlantIds.includes(s.plantId)) {
          throw new BadRequestException('Access denied for this plant');
        }
      }
    }

    const template = await this.templates.findOne({
      where: { id: s.templateId },
      relations: { fields: true },
    });

    if (!template) {
      return {
        ...s,
        template: null,
        answers: (s.answers ?? []).map((a) => ({
          id: a.id,
          fieldId: a.fieldId,
          value: a.value,
          field: null,
        })),
      };
    }

    const fieldById = new Map((template.fields ?? []).map((f) => [f.id, f]));

    return {
      id: s.id,
      templateId: s.templateId,
      templateVersion: s.templateVersion,
      plantId: s.plantId,
      submittedByUserId: s.submittedByUserId,
      status: s.status,
      rejectReason: s.rejectReason,
      submittedAt: s.submittedAt,
      reviewedAt: s.reviewedAt,
      reviewedByUserId: s.reviewedByUserId ?? null,

      template: {
        id: template.id,
        title: template.title,
        version: template.version,
        familyId: template.familyId,
      },

      answers: (s.answers ?? []).map((a) => {
        const f = fieldById.get(a.fieldId) ?? null;
        return {
          id: a.id,
          fieldId: a.fieldId,
          value: a.value,
          field: f
            ? {
                id: f.id,
                label: f.label,
                type: f.type,
                required: f.required,
                order: f.order,
                config: f.config ?? null,
              }
            : null,
        };
      }),
    };
  }
}
