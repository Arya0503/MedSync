import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORAGE_ROOT = path.resolve(process.cwd(), process.env.STORAGE_DIR || "./storage");

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface StoredFileResult {
  storagePath: string;
  sha256: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/**
 * Validates the true file signature (magic bytes) to prevent extension spoofing.
 */
export function validateFileSignature(buffer: Buffer): { valid: boolean; detectedMime: string | null; extension: string } {
  if (buffer.length < 4) {
    return { valid: false, detectedMime: null, extension: "" };
  }

  // PDF: %PDF (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { valid: true, detectedMime: "application/pdf", extension: "pdf" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: "image/png", extension: "png" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: "image/jpeg", extension: "jpg" };
  }

  return { valid: false, detectedMime: null, extension: "" };
}

/**
 * Stores an uploaded file to local disk under ./storage/<patientId>/<docId>.<ext>
 */
export async function saveFile(
  patientId: string,
  docId: string,
  buffer: Buffer,
  originalFileName: string
): Promise<StoredFileResult> {
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds maximum allowed size of 10 MB (received ${(buffer.length / (1024 * 1024)).toFixed(1)} MB)`);
  }

  const sig = validateFileSignature(buffer);
  if (!sig.valid) {
    throw new Error("Invalid file format. Only authentic PDF, PNG, and JPG files are supported.");
  }

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const patientFolder = path.join(STORAGE_ROOT, patientId);
  await fs.mkdir(patientFolder, { recursive: true });

  const fileName = `${docId}.${sig.extension}`;
  const absolutePath = path.join(patientFolder, fileName);
  await fs.writeFile(absolutePath, buffer);

  // Return relative storage path from root
  const relativePath = path.join(process.env.STORAGE_DIR || "./storage", patientId, fileName).replace(/\\/g, "/");

  return {
    storagePath: relativePath,
    sha256,
    fileName: originalFileName,
    mimeType: sig.detectedMime!,
    size: buffer.length,
  };
}

export async function readFile(storagePath: string): Promise<Buffer> {
  const resolved = path.resolve(process.cwd(), storagePath);
  // Ensure path is within STORAGE_ROOT to prevent directory traversal
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Access denied: invalid storage path");
  }
  return fs.readFile(resolved);
}

export async function deleteFile(storagePath: string): Promise<void> {
  const resolved = path.resolve(process.cwd(), storagePath);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("Access denied: invalid storage path");
  }
  try {
    await fs.unlink(resolved);
  } catch (err) {
    // Ignore if already deleted
  }
}
