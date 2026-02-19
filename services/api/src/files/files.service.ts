import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

@Injectable()
export class FilesService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>("MINIO_ENDPOINT") ?? "127.0.0.1";
    const port = Number(this.config.get<string>("MINIO_PORT") ?? "9000");
    const accessKeyId = this.config.get<string>("MINIO_ACCESS_KEY") ?? "";
    const secretAccessKey = this.config.get<string>("MINIO_SECRET_KEY") ?? "";
    const useSsl = (this.config.get<string>("MINIO_USE_SSL") ?? "false") === "true";

    this.bucket = this.config.get<string>("MINIO_BUCKET") ?? "factoryflow";

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("Missing MINIO_ACCESS_KEY or MINIO_SECRET_KEY");
    }

    this.s3 = new S3Client({
      region: "us-east-1",
      endpoint: `${useSsl ? "https" : "http"}://${endpoint}:${port}`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true, // IMPORTANT for MinIO
    });
  }

  private sanitizeFilename(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  async upload(file: { buffer: Buffer; originalName: string; mimeType: string; size: number }, folder = "photos") {
    if (!file?.buffer?.length) throw new BadRequestException("Empty file");

    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      throw new BadRequestException(`File too large. Max ${MAX_MB}MB`);
    }

    const safeName = this.sanitizeFilename(file.originalName || "file");
    const day = new Date().toISOString().slice(0, 10);
    const key = `${folder}/${day}/${randomUUID()}_${safeName}`;

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
    const cleanKey = (key ?? "").trim();
    if (!cleanKey) throw new BadRequestException("Invalid key");

    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: cleanKey });
    const url = await getSignedUrl(this.s3, cmd, { expiresIn: expiresInSeconds });

    return { key: cleanKey, expiresInSeconds, url };
  }
}
