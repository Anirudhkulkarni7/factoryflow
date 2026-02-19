import { Controller, Get, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import multer from "multer";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

import { FilesService } from "./files.service";

@Controller("files")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "MANAGER", "USER")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Query("folder") folder?: string) {
    return this.files.upload(
      {
        buffer: file?.buffer,
        originalName: file?.originalname ?? "file",
        mimeType: file?.mimetype ?? "application/octet-stream",
        size: file?.size ?? 0,
      },
      folder ?? "photos",
    );
  }

  @Get("signed-url")
  getSignedUrl(@Query("key") key: string, @Query("expiresIn") expiresIn?: string) {
    const exp = expiresIn ? Number(expiresIn) : 300;
    return this.files.getSignedGetUrl(key, Number.isFinite(exp) ? exp : 300);
  }
}
