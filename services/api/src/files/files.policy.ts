import { BadRequestException } from "@nestjs/common";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export const UPLOAD_RULES = {
  photos: {
    allowedMimeTypes: new Set(["image/jpeg", "image/png", "image/webp"]),
  },
} as const;

export type AllowedFolder = keyof typeof UPLOAD_RULES;

export function normalizeFolder(folder?: string): AllowedFolder {
  const f = (folder ?? "photos").trim().toLowerCase();
  if (!(f in UPLOAD_RULES)) {
    throw new BadRequestException(`Invalid folder: ${folder ?? ""}`);
  }
  return f as AllowedFolder;
}

export function assertAllowedUpload(folder: AllowedFolder, mimeType: string) {
  const rules = UPLOAD_RULES[folder];
  if (!rules.allowedMimeTypes.has(mimeType)) {
    throw new BadRequestException(`Invalid file type for ${folder}`);
  }
}

export function assertSafeKey(key: string, folder: AllowedFolder = "photos") {
  const k = (key ?? "").trim();
  if (!k) throw new BadRequestException("Invalid key");

  if (!k.startsWith(`${folder}/`)) throw new BadRequestException("Invalid key");

  if (k.includes("..") || k.includes("\\") || k.startsWith("/")) {
    throw new BadRequestException("Invalid key");
  }

  return k;
}