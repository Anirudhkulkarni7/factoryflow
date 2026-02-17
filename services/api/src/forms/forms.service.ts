import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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
  ) {}

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
    if (!byFieldId.has(a.fieldId)) throw new BadRequestException("Invalid fieldId in answers");
  }
const submission = this.submissions.create({
  templateId: template.id,
  templateVersion: template.version,
  plantId: input.plantId,
submittedByUserId: input.userId,
  status: "SUBMITTED",
});

  const saved = await this.submissions.save(submission);

  const answerEntities = input.answers.map((a) =>
    this.answers.create({
      submission: saved,
      fieldId: a.fieldId,
      value: (a.value ?? null) as any,
    }),
  );

  await this.answers.save(answerEntities);

  return this.submissions.findOne({
    where: { id: saved.id },
    relations: { answers: true },
  });
}

}
