import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class FileStorageService {
  /**
   * Defines the root folder where all files will be saved.
   * In Production: Uses the STORAGE_PATH environment variable (e.g., \\SERVER\share)
   * In Development: Falls back to a local 'uploads' folder inside the backend directory.
   */
  private static get basePath() {
    return process.env.STORAGE_PATH || path.join(process.cwd(), 'uploads');
  }

  /**
   * Saves a file buffer to the disk.
   * Requirements met: Folder by date (and uploader userId if supplied), UUID filename, original extension.
   *
   * @param fileBuffer The binary data of the file (from Multer)
   * @param originalFilename The original name of the file (e.g., "design.pdf")
   * @param userId Optional database ID of the user uploading the file
   * @returns The relative path to save in the database (e.g., "2026-08-23/userId/uuid.pdf")
   */
  static async saveFile(
    fileBuffer: Buffer,
    originalFilename: string,
    userId?: string
  ): Promise<string> {
    // 1. Create a folder structure based on today's date (YYYY/MM/DD) and optional userId
    const dateFolder = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const targetDir = userId
      ? path.join(this.basePath, dateFolder, userId)
      : path.join(this.basePath, dateFolder);

    // 2. Make sure the folder exists (recursive: true means it won't crash if it already exists)
    await fs.mkdir(targetDir, { recursive: true });

    // 3. Generate a unique filename using UUID and the original extension
    const extension = path.extname(originalFilename); // Gets ".pdf" or ".jpg"
    const uniqueFileName = `${crypto.randomUUID()}${extension}`;

    // 4. Combine everything into the final absolute path
    const absolutePath = path.join(targetDir, uniqueFileName);

    // 5. Write the binary data to the hard drive
    await fs.writeFile(absolutePath, fileBuffer);

    // 6. Return ONLY the relative part to store in PostgreSQL
    // We replace Windows backslashes with standard forward slashes for cross-platform safety
    const relativePath = userId
      ? path.join(dateFolder, userId, uniqueFileName)
      : path.join(dateFolder, uniqueFileName);

    return relativePath.replace(/\\/g, '/');
  }

  /**
   * Extracts the uploader's userId from a relative storage path if one was encoded.
   *
   * Path format:
   * - "YYYY/MM/DD/:userId/:uuid.:ext" (5 segments)
   * - ":userId/YYYY/MM/DD/:uuid.:ext" (fallback)
   */
  static extractUploaderId(relativePath: string): string | null {
    if (!relativePath) {
      return null;
    }

    const normalized = relativePath.replace(/\\/g, '/');
    const segments = normalized.split('/').filter(Boolean);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Pattern: YYYY/MM/DD/userId/filename.ext -> segments[3] is userId
    if (segments.length >= 5 && uuidRegex.test(segments[3])) {
      return segments[3];
    }

    // Pattern: userId/... -> segments[0] is userId
    if (segments.length >= 2 && uuidRegex.test(segments[0])) {
      return segments[0];
    }

    return null;
  }

  /**
   * Retrieves the absolute path for a given relative path (for downloading).
   * Includes comprehensive security checks to prevent "Path Traversal" hacking
   * across both Windows and Unix/Docker environments.
   */
  static getSecureAbsolutePath(relativePath: string): string {
    if (!relativePath || typeof relativePath !== 'string') {
      throw new Error('Security Error: Invalid file path.');
    }

    // Block null bytes and control characters
    if (relativePath.includes('\0')) {
      throw new Error('Security Error: Invalid file path.');
    }

    // Normalize forward and backward slashes for cross-platform safety
    const normalizedRelative = relativePath.replace(/\\/g, '/');

    // Reject absolute paths
    if (path.isAbsolute(relativePath) || path.isAbsolute(normalizedRelative)) {
      throw new Error('Security Error: Invalid file path.');
    }

    const resolvedBase = path.resolve(this.basePath);
    const absolutePath = path.resolve(resolvedBase, normalizedRelative);

    const relative = path.relative(resolvedBase, absolutePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error('Security Error: Invalid file path.');
    }

    return absolutePath;
  }
}
