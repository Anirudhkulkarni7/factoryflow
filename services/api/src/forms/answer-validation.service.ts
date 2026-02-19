import { BadRequestException, Injectable } from "@nestjs/common";
import { FormField } from "src/entities/forms/form-field.entity";

@Injectable()
export class AnswerValidationService {
  validate(field: FormField, value: unknown) {
    if (value === undefined) return; //ise hi rakhahe 
    if (value === null) return; // not reuiqred fields k liye null rakhahe 

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
        // later: validate allowed options via field.config.options
        return;
      }

      case "PHOTO": {
        if (typeof value !== "string") {
          throw new BadRequestException(`${field.label} must be a file key string`);
        }
        // later: validate it looks like a MinIO object key
        return;
      }

      default:
        throw new BadRequestException(`Unsupported field type: ${field.type}`);
    }
  }
}
