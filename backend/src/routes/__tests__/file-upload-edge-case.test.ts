import request from 'supertest';
import app from '../../app';
import { FileStorageService } from '../../services/file-storage.service';

jest.mock('../../services/file-storage.service', () => ({
  FileStorageService: {
    saveFile: jest.fn(),
  },
}));

const mockedSaveFile = jest.mocked(FileStorageService.saveFile);

const MB = 1024 * 1024;

const createPdfBuffer = (size: number): Buffer => {
  const header = Buffer.from('%PDF-1.4\n');
  const remaining = Buffer.alloc(Math.max(0, size - header.length));
  return Buffer.concat([header, remaining]);
};

describe('POST /api/files/upload - file upload edge cases', () => {
  beforeAll(() => {
    process.env.AUTH_MODE = 'mock';
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockedSaveFile.mockResolvedValue('2026/09/10/test-file.pdf');
  });

  describe('file size validation', () => {
    it('accepts a valid file smaller than 20 MB', async () => {
      const file = createPdfBuffer(1 * MB);

      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', file, {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        filePath: '2026/09/10/test-file.pdf',
      });

      expect(mockedSaveFile).toHaveBeenCalledTimes(1);
    });

    it('accepts a file exactly 20 MB', async () => {
      const file = createPdfBuffer(20 * MB);

      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', file, {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(200);
      expect(mockedSaveFile).toHaveBeenCalledTimes(1);
    });

    it('rejects a 20.5 MB file', async () => {
      const file = createPdfBuffer(Math.floor(20.5 * MB));

      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', file, {
          filename: 'too-large.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);

      expect(response.body).toEqual({
        error: 'הקובץ שנבחר גדול מדי. הגודל המרבי המותר הוא 20MB.',
      });

      expect(mockedSaveFile).not.toHaveBeenCalled();
    });
  });

  describe('unsupported file types', () => {
    it.each([
      {
        filename: 'archive.zip',
        contentType: 'application/zip',
      },
      {
        filename: 'program.exe',
        contentType: 'application/x-msdownload',
      },
      {
        filename: 'document.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    ])('rejects $filename', async ({ filename, contentType }) => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', Buffer.from('invalid file'), {
          filename,
          contentType,
        });

      expect(response.status).toBe(400);

      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });

      expect(mockedSaveFile).not.toHaveBeenCalled();
    });

    it('rejects an .exe file even when the MIME type claims to be PDF', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', Buffer.from('fake pdf'), {
          filename: 'program.exe',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);

      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });

      expect(mockedSaveFile).not.toHaveBeenCalled();
    });
  });

  describe('fake and spoofed files (magic bytes validation)', () => {
    it('rejects a fake PDF whose content is plain text', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', Buffer.from('This is not a real PDF file!'), {
          filename: 'spoofed.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });

    it('rejects an executable disguised as a PDF (starts with MZ header)', async () => {
      const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00');
      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', exeBuffer, {
          filename: 'malicious.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });

    it('rejects a fake PNG whose content is not valid PNG binary', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', Buffer.from('fake png image contents'), {
          filename: 'fake.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });

    it('rejects a fake JPEG whose content is not valid JPEG binary', async () => {
      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', Buffer.from('fake jpeg image contents'), {
          filename: 'fake.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });

    it('accepts a valid PNG file with correct magic bytes', async () => {
      // 8-byte PNG header: \x89PNG\r\n\x1a\n
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const validPng = Buffer.concat([pngHeader, Buffer.alloc(100)]);

      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', validPng, {
          filename: 'image.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(200);
      expect(mockedSaveFile).toHaveBeenCalledTimes(1);
    });

    it('accepts a valid JPEG file with correct magic bytes', async () => {
      // 3-byte JPEG SOI marker: 0xFF, 0xD8, 0xFF
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const validJpeg = Buffer.concat([jpegHeader, Buffer.alloc(100)]);

      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', validJpeg, {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(200);
      expect(mockedSaveFile).toHaveBeenCalledTimes(1);
    });

    it('rejects a real JPEG binary renamed with a .pdf extension (signature mismatch)', async () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const realJpegFile = Buffer.concat([jpegHeader, Buffer.alloc(100)]);

      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', realJpegFile, {
          filename: 'fake-document.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });

    it('rejects a real PDF binary renamed with a .png extension (signature mismatch)', async () => {
      const realPdfFile = createPdfBuffer(500);

      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', realPdfFile, {
          filename: 'fake-image.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });

    it('rejects a real PNG binary renamed with a .jpg extension (signature mismatch)', async () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const realPngFile = Buffer.concat([pngHeader, Buffer.alloc(100)]);

      const response = await request(app)
        .post('/api/files/upload')
        .set('X-Mock-User', 'requester')
        .attach('file', realPngFile, {
          filename: 'fake-photo.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'פורמט הקובץ אינו נתמך. ניתן להעלות קבצי PDF או תמונות בלבד.',
      });
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });
  });

  describe('missing file', () => {
    it('rejects a request without a file', async () => {
      const response = await request(app).post('/api/files/upload').set('X-Mock-User', 'requester');

      expect(response.status).toBe(400);
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });
  });
});
