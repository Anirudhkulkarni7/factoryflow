import { Injectable } from "@nestjs/common";

import { FormSubmissionsService } from "./form-submissions.service";
import { SubmissionReviewService } from "./submission-review.service";
import { FormTemplatesService } from "./form-templates.service";

@Injectable()
export class FormsService {
  constructor(
    private readonly submissionsService: FormSubmissionsService,
    private readonly reviewService: SubmissionReviewService,
    private readonly templatesService: FormTemplatesService,
  ) {}

  create(input: Parameters<FormTemplatesService["create"]>[0]) {
    return this.templatesService.create(input);
  }

  list(input?: Parameters<FormTemplatesService["list"]>[0]) {
    return this.templatesService.list(input);
  }
  importFromJson(input: Parameters<FormTemplatesService["create"]>[0]) {
  return this.templatesService.create(input);
}

  publish(id: string) {
    return this.templatesService.publish(id);
  }

  listPublishedForPlant(plantId: string) {
    return this.templatesService.listPublishedForPlant(plantId);
  }

  updateTemplate(input: Parameters<FormTemplatesService["updateTemplate"]>[0]) {
    return this.templatesService.updateTemplate(input);
  }

  archiveTemplate(id: string) {
    return this.templatesService.archiveTemplate(id);
  }

  getTemplateById(id: string) {
    return this.templatesService.getTemplateById(id);
  }

  cloneTemplate(id: string) {
    return this.templatesService.cloneTemplate(id);
  }

  createSubmission(input: Parameters<FormSubmissionsService["createSubmission"]>[0]) {
    return this.submissionsService.createSubmission(input);
  }

  listSubmissions(input: Parameters<FormSubmissionsService["listSubmissions"]>[0]) {
    return this.submissionsService.listSubmissions(input);
  }

  listMySubmissions(input: Parameters<FormSubmissionsService["listMySubmissions"]>[0]) {
    return this.submissionsService.listMySubmissions(input);
  }

  getSubmissionById(input: Parameters<FormSubmissionsService["getSubmissionById"]>[0]) {
    return this.submissionsService.getSubmissionById(input);
  }

  approveSubmission(input: Parameters<SubmissionReviewService["approveSubmission"]>[0]) {
    return this.reviewService.approveSubmission(input);
  }

  rejectSubmission(input: Parameters<SubmissionReviewService["rejectSubmission"]>[0]) {
    return this.reviewService.rejectSubmission(input);
  }
  
}
