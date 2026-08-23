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
   * Requirements met: Folder by date, UUID filename, original extension.
   *
   * @param fileBuffer The binary data of the file (from Multer)
   * @param originalFilename The original name of the file (e.g., "design.pdf")
   * @returns The relative path to save in the database (e.g., "2026-08-23/uuid.pdf")
   */
  static async saveFile(fileBuffer: Buffer, originalFilename: string): Promise<string> {
    // 1. Create a folder structure based on today's date (YYYY/MM/DD)
    const dateFolder = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const targetDir = path.join(this.basePath, dateFolder);

    // 2. Make sure the folder exists (recursive: true means it won't crash if it already exists)
    await fs.mkdir(targetDir, { recursive: true });

    // 3. Generate a unique filename using UUID and the original extension
    const extension = path.extname(originalFilename); // Gets ".pdf" or ".jpg"
    const uniqueFileName = `${crypto.randomUUID()}${extension}`;

    // 4. Combine everything into the final absolute path
    const absolutePath = path.join(targetDir, uniqueFileName);

    // 5. Write the binary data to the hard drive
    await fs.writeFile(absolutePath, fileBuffer);

    // 6. Return ONLY the relative part (e.g., "2026-08-23/a1b2c3.pdf") to store in PostgreSQL
    // We replace Windows backslashes with standard forward slashes for cross-platform safety
    return path.join(dateFolder, uniqueFileName).replace(/\\/g, '/');
  }

  /**
   * Retrieves the absolute path for a given relative path (for downloading).
   * Includes a critical security check to prevent "Path Traversal" hacking.
   */
  static getSecureAbsolutePath(relativePath: string): string {
    const absolutePath = path.resolve(this.basePath, relativePath);

    // Security check: Make sure the hacker didn't send "../../../windows/system32"
    if (!absolutePath.startsWith(path.resolve(this.basePath))) {
      throw new Error('Security Error: Invalid file path.');
    }

    return absolutePath;
  }
}
