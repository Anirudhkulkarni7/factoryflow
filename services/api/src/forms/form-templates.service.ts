import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";

import { Plant } from "src/entities/plant.entity";
import { FormTemplate } from "src/entities/forms/form-template.entity";
import { FormField } from "src/entities/forms/form-field.entity";
import { randomUUID } from "crypto";

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
      const count = await this.plants.count({ where: { id: In(input.plantIds) } });
      if (count !== input.plantIds.length) {
        throw new BadRequestException("Invalid plantIds");
      }
    }

    const templateId = randomUUID();

const template = this.templates.create({
  id: templateId,
  familyId: templateId,
  title: input.title,
  plantIds: input.plantIds,
  createdByUserId: input.createdByUserId,
  status: "DRAFT",
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
    status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    page?: number;
    limit?: number;
  }) {
    const page = input?.page ?? 1;
    const limit = input?.limit ?? 20;

    const qb = this.templates
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.fields", "f")
      .orderBy("t.createdAt", "DESC")
      .addOrderBy("f.order", "ASC");

    if (input?.status) qb.andWhere("t.status = :status", { status: input.status });

    if (input?.q && input.q.trim().length > 0) {
      const term = `%${input.q.trim().toLowerCase()}%`;
      qb.andWhere("LOWER(t.title) LIKE :term", { term });
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
    if (!t) throw new BadRequestException("Form not found");
    return t;
  }

  async publish(id: string) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new BadRequestException("Form not found");

    if (t.status !== "DRAFT") return t;

    t.status = "PUBLISHED";
    return this.templates.save(t);
  }

  async archiveTemplate(id: string) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new BadRequestException("Form not found");

    if (t.status === "ARCHIVED") return t;

    t.status = "ARCHIVED";
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
      if (!t) throw new BadRequestException("Form not found");

      if (t.status !== "DRAFT") {
        throw new BadRequestException("Only DRAFT forms can be edited");
      }

      if (input.plantIds) {
        const count = await this.plants.count({ where: { id: In(input.plantIds) } });
        if (count !== input.plantIds.length) {
          throw new BadRequestException("Invalid plantIds");
        }
      }

      await templatesRepo.update(
        { id: t.id },
        {
          title: typeof input.title === "string" ? input.title : t.title,
          plantIds: input.plantIds ?? t.plantIds,
        },
      );

      if (input.fields) {
        await fieldsRepo.delete({ templateId: t.id });

        const newFields = input.fields.map((f, idx) =>
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
    if (!t) throw new BadRequestException("Form not found");

    return this.dataSource.transaction(async (tx) => {
      const templateRepo = tx.getRepository(FormTemplate);
      const fieldRepo = tx.getRepository(FormField);

      const familyId = t.familyId ?? t.id;

      const row = await templateRepo
        .createQueryBuilder("tt")
        .select("MAX(tt.version)", "max")
        .where("tt.familyId = :familyId", { familyId })
        .getRawOne<{ max: string | null }>();

      const nextVersion = (row?.max ? Number(row.max) : (t.version ?? 1)) + 1;

      const cloned = templateRepo.create({
        title: t.title,
        plantIds: t.plantIds ?? [],
        createdByUserId: t.createdByUserId,
        status: "DRAFT",
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
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.fields", "f")
      .where("t.status = :status", { status: "PUBLISHED" })
      .andWhere(
        '(cardinality(t."plantIds") = 0 OR t."plantIds" @> ARRAY[:plantId]::text[])',
        { plantId },
      )
      .addOrderBy("f.order", "ASC")
      .getMany();

    const latestByFamily = new Map<string, (typeof all)[number]>();

    for (const t of all) {
      const key = t.familyId ?? t.id;
      const existing = latestByFamily.get(key);
      if (!existing || t.version > existing.version) {
        latestByFamily.set(key, t);
      }
    }

    return Array.from(latestByFamily.values()).sort((a, b) => b.version - a.version);
  }
}
