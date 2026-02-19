import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import { FormTemplate } from "src/entities/forms/form-template.entity";
import { FormSubmission } from "src/entities/forms/form-submission.entity";
import { SubmissionAnswer } from "src/entities/forms/submission-answer.entity";

import { AnswerValidationService } from "./answer-validation.service";

@Injectable()
export class FormSubmissionsService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
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
    if (input.role !== "ADMIN" && !input.userPlantIds.includes(input.plantId)) {
      throw new BadRequestException("Access denied for this plant");
    }

    const template = await this.templates.findOne({
      where: { id: input.templateId },
      relations: { fields: true },
    });
    if (!template) throw new BadRequestException("Form not found");
    if (template.status !== "PUBLISHED") {
      throw new BadRequestException("Form not published");
    }

    if (template.plantIds.length > 0 && !template.plantIds.includes(input.plantId)) {
      throw new BadRequestException("Form not available for this plant");
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
      if (!field) throw new BadRequestException("Invalid fieldId in answers");
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

  async listMySubmissions(input: { userId: string; status?: "SUBMITTED" | "APPROVED" | "REJECTED" }) {
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

    if (input.role === "USER") {
      if (s.submittedByUserId !== input.userId) {
        throw new BadRequestException("Access denied");
      }
      return s;
    }

    if (!input.userPlantIds.includes(s.plantId)) {
      throw new BadRequestException("Access denied for this plant");
    }

    return s;
  }
}
