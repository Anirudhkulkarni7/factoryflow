import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_FOLDERS = new Set(["photos"] as const);
const ALLOWED_PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type AllowedFolder = "photos";

function normalizeFolder(folder?: string): AllowedFolder {
  const f = (folder ?? "photos").trim().toLowerCase();
  if (!ALLOWED_FOLDERS.has(f as AllowedFolder)) {
    throw new BadRequestException(`Invalid folder: ${folder ?? ""}`);
  }
  return f as AllowedFolder;
}

function assertAllowedUpload(folder: AllowedFolder, mimeType: string) {
  if (folder === "photos" && !ALLOWED_PHOTO_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException("Invalid file type for photos");
  }
}

function assertSafeKey(key: string, folder: AllowedFolder = "photos") {
  const k = (key ?? "").trim();
  if (!k) throw new BadRequestException("Invalid key");
  if (!k.startsWith(`${folder}/`)) throw new BadRequestException("Invalid key prefix");
  if (k.includes("..") || k.includes("\\") || k.startsWith("/")) {
    throw new BadRequestException("Invalid key");
  }
  return k;
}

function clampExpiresIn(expiresInSeconds?: number) {
  const exp = Number(expiresInSeconds ?? 300);
  if (!Number.isFinite(exp)) return 300;
  return Math.max(30, Math.min(exp, 3600));
}

@Injectable()
export class FilesService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>("MINIO_ENDPOINT") ?? "127.0.0.1";
    const port = Number(this.config.get<string>("MINIO_PORT") ?? "9000");
    const accessKeyId = this.config.get<string>("MINIO_ACCESS_KEY") ?? "";
    const secretAccessKey = this.config.get<string>("MINIO_SECRET_KEY") ?? "";
    const useSsl =
      (this.config.get<string>("MINIO_USE_SSL") ?? "false") === "true";

    this.bucket = this.config.get<string>("MINIO_BUCKET") ?? "factoryflow";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("Missing MINIO_ACCESS_KEY or MINIO_SECRET_KEY");
    }

    this.s3 = new S3Client({
      region: "us-east-1",
      endpoint: `${useSsl ? "https" : "http"}://${endpoint}:${port}`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // MinIO needs path-style
    });
  }

  private sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  async upload(
    file: { buffer: Buffer; originalName: string; mimeType: string; size: number },
    folder: AllowedFolder = "photos",
  ) {
    if (!file?.buffer?.length) throw new BadRequestException("Empty file"); // validate file

    const safeFolder = normalizeFolder(folder); // whitelist folder
    assertAllowedUpload(safeFolder, file.mimeType); // enforce mime policy

    if ((file.size ?? 0) > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("File too large"); // consistent size error
    }

    const safeName = this.sanitizeFilename(file.originalName || "file");
    const day = new Date().toISOString().slice(0, 10);
    const key = `${safeFolder}/${day}/${randomUUID()}_${safeName}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimeType,
      }),
    );

    return { key, bucket: this.bucket, mimeType: file.mimeType, size: file.size };
  }

  async getSignedGetUrl(key: string, expiresInSeconds = 300) {
    const cleanKey = assertSafeKey(key, "photos");
    const safeExp = clampExpiresIn(expiresInSeconds); // clamp expiry

    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: cleanKey });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn: safeExp });

    return { key: cleanKey, expiresInSeconds: safeExp, url };
  }
}