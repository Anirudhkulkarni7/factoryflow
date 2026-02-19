import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { FormSubmission } from "src/entities/forms/form-submission.entity";

@Injectable()
export class SubmissionReviewService {
  constructor(
    @InjectRepository(FormSubmission)
    private readonly submissions: Repository<FormSubmission>,
  ) {}

  async approveSubmission(input: {
    submissionId: string;
    reviewerUserId: string;
    role: string;
    reviewerPlantIds: string[];
  }) {
    const s = await this.submissions.findOne({
      where: { id: input.submissionId },
    });
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
    const s = await this.submissions.findOne({
      where: { id: input.submissionId },
    });
    if (!s) throw new BadRequestException("Submission not found");

    if (input.role !== "ADMIN" && !input.reviewerPlantIds.includes(s.plantId)) {
      throw new BadRequestException("Access denied for this plant");
    }

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
}
