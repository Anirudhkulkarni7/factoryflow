import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import { Plant } from 'src/entities/plant.entity';
import { FormTemplate } from 'src/entities/forms/form-template.entity';
import { FormField } from 'src/entities/forms/form-field.entity';
import { randomUUID } from 'node:crypto';

@Injectable()
export class FormTemplatesService {
  constructor(
    @InjectRepository(FormTemplate)
    private readonly templates: Repository<FormTemplate>,
    @InjectRepository(FormField)
    private readonly fields: Repository<FormField>,
    @InjectRepository(Plant)
    private readonly plants: Repository<Plant>,
    private readonly dataSource: DataSource,
  ) {}

  private normalizeAndValidateCreateInput(input: {
    title: string;
    fields: Array<{
      label: string;
      type: string;
      required: boolean;
      config?: Record<string, unknown>;
    }>;
  }) {
    const title = (input.title ?? '').trim();
    if (!title) throw new BadRequestException('Title is required');

    if (!Array.isArray(input.fields) || input.fields.length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    if (input.fields.length > FormTemplatesService.MAX_FIELDS) {
      throw new BadRequestException(
        `Too many fields. Max ${FormTemplatesService.MAX_FIELDS}`,
      );
    }

    const seenLabels = new Set<string>();

    const fields = input.fields.map((f, idx) => {
      const label = (f.label ?? '').trim();
      if (!label) {
        throw new BadRequestException(`Field #${idx + 1}: label is required`);
      }

      const labelKey = label.toLowerCase();
      if (seenLabels.has(labelKey)) {
        throw new BadRequestException(`Duplicate field label: ${label}`);
      }
      seenLabels.add(labelKey);

      const type = String(f.type ?? '').toUpperCase();
      if (!FormTemplatesService.ALLOWED_TYPES.has(type)) {
        throw new BadRequestException(`Invalid field type: ${f.type}`);
      }

      const required = !!f.required;
      const cfg: any = f.config ?? null;

      if (type === 'DROPDOWN') {
        const raw = cfg?.options;
        if (!Array.isArray(raw) || raw.length === 0) {
          throw new BadRequestException(
            `Field "${label}": DROPDOWN requires config.options (non-empty string array)`,
          );
        }

        const trimmed = raw
          .map((o: any) => String(o ?? '').trim())
          .filter(Boolean);

        if (trimmed.length === 0) {
          throw new BadRequestException(
            `Field "${label}": options cannot be empty`,
          );
        }

        const unique = new Map<string, string>();
        for (const opt of trimmed) {
          const k = opt.toLowerCase();
          if (!unique.has(k)) unique.set(k, opt);
        }
        const options = Array.from(unique.values());

        if (options.length > FormTemplatesService.MAX_DROPDOWN_OPTIONS) {
          throw new BadRequestException(
            `Field "${label}": too many options. Max ${FormTemplatesService.MAX_DROPDOWN_OPTIONS}`,
          );
        }

        return { label, type, required, config: { options } };
      }

      return { label, type, required, config: f.config ?? null };
    });

    return { title, fields };
  }

  private static readonly ALLOWED_TYPES = new Set([
    'TEXT',
    'NUMBER',
    'CHECKBOX',
    'DROPDOWN',
    'DATE',
    'PHOTO',
  ]);

  private static readonly MAX_FIELDS = 100;
  private static readonly MAX_DROPDOWN_OPTIONS = 50;

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
      if (count !== input.plantIds.length) {
        throw new BadRequestException('Invalid plantIds');
      }
    }

    const { title, fields } = this.normalizeAndValidateCreateInput(input);

    const templateId = randomUUID();

    const template = this.templates.create({
      id: templateId,
      familyId: templateId,
      title,
      plantIds: input.plantIds,
      createdByUserId: input.createdByUserId,
      status: 'DRAFT',
      version: 1,
    });

    const savedTemplate = await this.templates.save(template);

    const fieldEntities = fields.map((f, idx) =>
      this.fields.create({
        templateId: savedTemplate.id,
        label: f.label,
        type: f.type as any,
        required: f.required,
        order: idx + 1,
        config: f.config ?? null,
      }),
    );

    await this.fields.save(fieldEntities);

    return this.templates.findOne({
      where: { id: savedTemplate.id },
      relations: { fields: true },
    });
  }

  async list(input?: {
    q?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    page?: number;
    limit?: number;
  }) {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;

    const qb = this.templates
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fields', 'f')
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('f.order', 'ASC');

    if (input?.status)
      qb.andWhere('t.status = :status', { status: input.status });

    if (input?.q && input.q.trim().length > 0) {
      const term = `%${input.q.trim().toLowerCase()}%`;
      qb.andWhere('LOWER(t.title) LIKE :term', { term });
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, page, limit, total };
  }

  async getTemplateById(id: string) {
    const t = await this.templates.findOne({
      where: { id },
      relations: { fields: true },
    });
    if (!t) throw new BadRequestException('Form not found');
    return t;
  }

  async publish(id: string) {
    return this.dataSource.transaction(async (tx) => {
      const templatesRepo = tx.getRepository(FormTemplate);
      const fieldsRepo = tx.getRepository(FormField);

      const t = await templatesRepo.findOne({ where: { id } });
      if (!t) throw new BadRequestException('Form not found');

      if (t.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT forms can be published');
      }

      const fieldCount = await fieldsRepo.count({
        where: { templateId: t.id },
      });
      if (fieldCount === 0) {
        throw new BadRequestException('Cannot publish a form with 0 fields');
      }

      t.status = 'PUBLISHED';
      return templatesRepo.save(t);
    });
  }

  async archiveTemplate(id: string) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new BadRequestException('Form not found');

    if (t.status !== 'PUBLISHED') {
      throw new BadRequestException('Only PUBLISHED forms can be archived');
    }

    t.status = 'ARCHIVED';
    return this.templates.save(t);
  }

  async updateTemplate(input: {
    id: string;
    title?: string;
    plantIds?: string[];
    fields?: Array<{
      label: string;
      type: string;
      required: boolean;
      config?: Record<string, unknown>;
    }>;
  }) {
    return this.dataSource.transaction(async (tx) => {
      const templatesRepo = tx.getRepository(FormTemplate);
      const fieldsRepo = tx.getRepository(FormField);

      const t = await templatesRepo.findOne({ where: { id: input.id } });
      if (!t) throw new BadRequestException('Form not found');

      if (t.status !== 'DRAFT') {
        throw new BadRequestException('Only DRAFT forms can be edited');
      }

      if (input.plantIds) {
        const count = await this.plants.count({
          where: { id: In(input.plantIds) },
        });
        if (count !== input.plantIds.length) {
          throw new BadRequestException('Invalid plantIds');
        }
      }

      await templatesRepo.update(
        { id: t.id },
        {
          title: typeof input.title === 'string' ? input.title : t.title,
          plantIds: input.plantIds ?? t.plantIds,
        },
      );

      if (input.fields) {
        const normalized = this.normalizeAndValidateCreateInput({
          title: typeof input.title === 'string' ? input.title : t.title,
          fields: input.fields,
        });

        await fieldsRepo.delete({ templateId: t.id });

        const newFields = normalized.fields.map((f, idx) =>
          fieldsRepo.create({
            templateId: t.id,
            label: f.label,
            type: f.type as any,
            required: f.required,
            order: idx + 1,
            config: f.config ?? null,
          }),
        );

        await fieldsRepo.save(newFields);
      }

      return templatesRepo.findOne({
        where: { id: t.id },
        relations: { fields: true },
      });
    });
  }

  async cloneTemplate(id: string) {
    const t = await this.templates.findOne({
      where: { id },
      relations: { fields: true },
    });
    if (!t) throw new BadRequestException('Form not found');

    return this.dataSource.transaction(async (tx) => {
      const templateRepo = tx.getRepository(FormTemplate);
      const fieldRepo = tx.getRepository(FormField);

      const familyId = t.familyId ?? t.id;

      const row = await templateRepo
        .createQueryBuilder('tt')
        .select('MAX(tt.version)', 'max')
        .where('tt.familyId = :familyId', { familyId })
        .getRawOne<{ max: string | null }>();

      const nextVersion = (row?.max ? Number(row.max) : (t.version ?? 1)) + 1;

      const cloned = templateRepo.create({
        title: t.title,
        plantIds: t.plantIds ?? [],
        createdByUserId: t.createdByUserId,
        status: 'DRAFT',
        familyId,
        version: nextVersion,
      });

      const savedTemplate = await templateRepo.save(cloned);

      const newFields = (t.fields ?? [])
        .sort((a, b) => a.order - b.order)
        .map((f) =>
          fieldRepo.create({
            templateId: savedTemplate.id,
            label: f.label,
            type: f.type,
            required: f.required,
            order: f.order,
            config: f.config ?? null,
          }),
        );

      await fieldRepo.save(newFields);

      return templateRepo.findOne({
        where: { id: savedTemplate.id },
        relations: { fields: true },
      });
    });
  }

  async listPublishedForPlant(plantId: string) {
    const all = await this.templates
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.fields', 'f')
      .where('t.status = :status', { status: 'PUBLISHED' })
      .andWhere(
        '(cardinality(t."plantIds") = 0 OR t."plantIds" @> ARRAY[:plantId]::text[])',
        { plantId },
      )
      .addOrderBy('f.order', 'ASC')
      .getMany();

    const latestByFamily = new Map<string, (typeof all)[number]>();

    for (const t of all) {
      const key = t.familyId ?? t.id;
      const existing = latestByFamily.get(key);
      if (!existing || t.version > existing.version) {
        latestByFamily.set(key, t);
      }
    }

    return Array.from(latestByFamily.values()).sort(
      (a, b) => b.version - a.version,
    );
  }
}
