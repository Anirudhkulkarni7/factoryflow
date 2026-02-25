import { BadRequestException, Injectable } from "@nestjs/common";
import { FormField } from "src/entities/forms/form-field.entity";

@Injectable()
export class AnswerValidationService {
  validate(field: FormField, value: unknown) {
    if (value === undefined) return;
    if (value === null) return;

    switch (field.type) {
      case "TEXT": {
        if (typeof value !== "string") {
          throw new BadRequestException(`${field.label} must be a string`);
        }
        return;
      }

      case "NUMBER": {
        if (typeof value !== "number" || Number.isNaN(value)) {
          throw new BadRequestException(`${field.label} must be a number`);
        }
        return;
      }

      case "CHECKBOX": {
        if (typeof value !== "boolean") {
          throw new BadRequestException(`${field.label} must be a boolean`);
        }
        return;
      }

      case "DATE": {
        if (typeof value !== "string") {
          throw new BadRequestException(`${field.label} must be an ISO date string`);
        }
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) {
          throw new BadRequestException(`${field.label} must be a valid date`);
        }
        return;
      }

      case "DROPDOWN": {
        if (typeof value !== "string") {
          throw new BadRequestException(`${field.label} must be a string option`);
        }

        const cfg = field.config as any;
        const optionsRaw = cfg?.options;

        if (!Array.isArray(optionsRaw) || optionsRaw.length === 0) {
          throw new BadRequestException(`${field.label} has no options configured`);
        }

        const options = optionsRaw
          .map((o: any) => String(o ?? "").trim())
          .filter(Boolean);

        if (options.length === 0) {
          throw new BadRequestException(`${field.label} has invalid options configured`);
        }

        const incoming = value.trim();
        const ok = options.some((opt) => opt.toLowerCase() === incoming.toLowerCase());
        if (!ok) {
          throw new BadRequestException(`${field.label} must be one of the allowed options`);
        }

        return;
      }

      case "PHOTO": {
        if (typeof value !== "string") {
          throw new BadRequestException(`${field.label} must be a file key string`);
        }

        const key = value.trim();
        if (!key) throw new BadRequestException(`${field.label} must be a valid file key`);
        if (!key.startsWith("photos/")) {
          throw new BadRequestException(`${field.label} must be a photos/ key`);
        }
        if (key.includes("..") || key.includes("\\") || key.startsWith("/")) {
          throw new BadRequestException(`${field.label} has an invalid file key`);
        }
        if (key.length > 512) {
          throw new BadRequestException(`${field.label} file key is too long`);
        }

        return;
      }

      default:
        throw new BadRequestException(`Unsupported field type: ${field.type}`);
    }
  }
}