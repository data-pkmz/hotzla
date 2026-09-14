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

describe('POST /api/files/upload - file upload edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedSaveFile.mockResolvedValue('2026/09/10/test-file.pdf');
  });

  describe('file size validation', () => {
    it('accepts a valid file smaller than 20 MB', async () => {
      const file = Buffer.alloc(1 * MB);

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
      const file = Buffer.alloc(20 * MB);

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
      const file = Buffer.alloc(Math.floor(20.5 * MB));

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

  describe('missing file', () => {
    it('rejects a request without a file', async () => {
      const response = await request(app).post('/api/files/upload').set('X-Mock-User', 'requester');

      expect(response.status).toBe(400);
      expect(mockedSaveFile).not.toHaveBeenCalled();
    });
  });
});
