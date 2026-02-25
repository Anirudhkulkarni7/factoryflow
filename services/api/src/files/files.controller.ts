import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from "@nestjs/swagger";
import multer from "multer";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";

import { FilesService } from "./files.service";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const UPLOAD_RULES = {
  photos: {
    allowedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
  },
} as const;

type AllowedFolder = keyof typeof UPLOAD_RULES;

function normalizeFolder(folder?: string): AllowedFolder {
  const f = (folder ?? "photos").trim().toLowerCase();
  if (!(f in UPLOAD_RULES)) {
    throw new BadRequestException(`Invalid folder: ${folder ?? ""}`);
  }
  return f as AllowedFolder;
}

function assertAllowedUpload(folder: AllowedFolder, mimeType: string) {
  const rules = UPLOAD_RULES[folder];
  if (!rules.allowedMimeTypes.has(mimeType)) {
    throw new BadRequestException(`Invalid file type for ${folder}`);
  }
}

function assertSafeKey(key: string, folder: AllowedFolder = "photos") {
  const k = (key ?? "").trim();
  if (!k) throw new BadRequestException("key is required");
  if (!k.startsWith(`${folder}/`)) {
    throw new BadRequestException("Invalid key prefix");
  }
  if (k.includes("..") || k.startsWith("/") || k.includes("\\")) {
    throw new BadRequestException("Invalid key");
  }
  return k;
}

function clampExpiresIn(expiresIn?: string) {
  const exp = expiresIn ? Number(expiresIn) : 300;
  if (!Number.isFinite(exp)) return 300;
  return Math.max(30, Math.min(exp, 3600));
}

@ApiTags("files")
@ApiBearerAuth("bearer")
@Controller("files")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN", "MANAGER", "USER")
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post("upload")
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
      required: ["file"],
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      storage: multer.memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE_BYTES },
      fileFilter: (req, file, cb) => {
        const folderRaw = (req?.query?.folder as string | undefined) ?? "photos";
        let folder: AllowedFolder;
        try {
          folder = normalizeFolder(folderRaw);
          assertAllowedUpload(folder, file.mimetype);
          cb(null, true);
        } catch (e) {
          cb(e as any, false);
        }
      },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query("folder") folder?: string,
  ) {
    const safeFolder = normalizeFolder(folder);

    if (!file) {
      throw new BadRequestException("file is required");
    }

    if ((file.size ?? 0) > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("File too large");
    }

    assertAllowedUpload(safeFolder, file.mimetype ?? "application/octet-stream");

    return this.files.upload(
      {
        buffer: file.buffer,
        originalName: file.originalname ?? "file",
        mimeType: file.mimetype ?? "application/octet-stream",
        size: file.size ?? 0,
      },
      safeFolder as any,
    );
  }

  @Get("signed-url")
  getSignedUrl(
    @Query("key") key: string,
    @Query("expiresIn") expiresIn?: string,
  ) {
    const safeKey = assertSafeKey(key, "photos");
    const safeExp = clampExpiresIn(expiresIn);
    return this.files.getSignedGetUrl(safeKey, safeExp);
  }
}