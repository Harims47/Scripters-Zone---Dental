import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

/**
 * Ensures uploads directory structure exists.
 */
export function getUploadsRootDir(): string {
  const root = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true });
  }
  return root;
}

export interface SaveImageResult {
  urlPath: string;
  fileSize: number;
  mimeType: string;
  fileName: string;
}

/**
 * Saves a base64 DataURL or raw base64 image string to disk under /uploads/{category}/{subId}/.
 * Returns the web-accessible relative URL path (e.g. /uploads/dental-images/patient_123/img.jpg).
 */
export async function saveImageToDisk(
  payload: string,
  category: 'dental-images' | 'patient-photos',
  subId: string,
  preferredFileName?: string
): Promise<SaveImageResult> {
  // If already a relative uploaded URL path or external URL, return as-is
  if (!payload || payload.startsWith('/uploads/') || payload.startsWith('http://') || payload.startsWith('https://')) {
    return {
      urlPath: payload,
      fileSize: 0,
      mimeType: 'image/jpeg',
      fileName: preferredFileName || 'image'
    };
  }

  let mimeType = 'image/jpeg';
  let base64Data = payload;

  const dataUriMatch = payload.match(/^data:([^;]+);base64,(.*)$/s);
  if (dataUriMatch) {
    mimeType = dataUriMatch[1].toLowerCase();
    base64Data = dataUriMatch[2];
  }

  // Validate MIME type
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType as any)) {
    throw new Error(`Unsupported image format: ${mimeType}. Only JPEG, PNG, and WEBP are supported.`);
  }

  const buffer = Buffer.from(base64Data, 'base64');

  // Validate size
  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit of 2 MB.`);
  }

  const ext = MIME_EXTENSION_MAP[mimeType] || '.jpg';
  const cleanSubId = subId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetDir = path.join(getUploadsRootDir(), category, cleanSubId);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const sanitizedBase = preferredFileName
    ? preferredFileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    : 'image';
  const finalFileName = `${sanitizedBase}_${timestamp}_${randomSuffix}${ext}`;
  const absoluteFilePath = path.join(targetDir, finalFileName);

  fs.writeFileSync(absoluteFilePath, buffer);

  const relativeUrlPath = `/uploads/${category}/${cleanSubId}/${finalFileName}`;

  return {
    urlPath: relativeUrlPath,
    fileSize: buffer.length,
    mimeType,
    fileName: finalFileName
  };
}

/**
 * Deletes a file from the /uploads directory if it exists.
 * Safely prevents path traversal.
 */
export function deleteStoredFile(urlPath?: string | null): boolean {
  if (!urlPath || !urlPath.startsWith('/uploads/')) {
    return false;
  }

  try {
    const uploadsRoot = getUploadsRootDir();
    // urlPath starts with /uploads/
    const relativePart = urlPath.replace(/^\/uploads\/?/, '');
    const absoluteTarget = path.normalize(path.join(uploadsRoot, relativePart));

    // Security check: ensure path does not escape uploads directory
    if (!absoluteTarget.startsWith(uploadsRoot)) {
      console.warn(`Path traversal attempt detected and blocked: ${urlPath}`);
      return false;
    }

    if (fs.existsSync(absoluteTarget)) {
      fs.unlinkSync(absoluteTarget);
      return true;
    }
  } catch (err) {
    console.error(`Failed to delete stored file at ${urlPath}:`, err);
  }
  return false;
}
