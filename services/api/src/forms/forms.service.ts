import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Plant } from "src/entities/plant.entity";
import { FormTemplate } from "src/entities/forms/form-template.entity";
import { FormField } from "src/entities/forms/form-field.entity";

@Injectable()
export class FormsService {
  constructor(
    @InjectRepository(FormTemplate) private readonly templates: Repository<FormTemplate>,
    @InjectRepository(FormField) private readonly fields: Repository<FormField>,
    @InjectRepository(Plant) private readonly plants: Repository<Plant>,
  ) {}

  async create(input: {
    title: string;
    plantIds: string[];
    createdByUserId: string;
    fields: Array<{ label: string; type: string; required: boolean; config?: Record<string, unknown> }>;
  }) {
    if (input.plantIds.length > 0) {
      const count = await this.plants.count({ where: { id: In(input.plantIds) } });
      if (count !== input.plantIds.length) throw new BadRequestException("Invalid plantIds");
    }

    const template = this.templates.create({
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
      order: { createdAt: "DESC" },
      relations: { fields: true },
    });
  }

  async publish(id: string) {
    const t = await this.templates.findOne({ where: { id } });
    if (!t) throw new BadRequestException("Form not found");

    if (t.status !== "DRAFT") return t;

    t.status = "PUBLISHED";
    return this.templates.save(t);
  }
}
