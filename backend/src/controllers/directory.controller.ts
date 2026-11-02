import { Request, Response } from 'express';
import { directoryService } from '../services/directory.service';
import logger from '../utils/logger';

export class DirectoryController {
  /**
   * Searches organizational contacts in Outlook / Active Directory.
   * Route: GET /api/directory/contacts?q=...
   */
  static async searchContacts(req: Request, res: Response) {
    try {
      const query = (req.query.q as string) || '';

      if (!query || query.trim().length < 2) {
        return res.json({ contacts: [] });
      }

      const contacts = await directoryService.searchContacts(query);
      return res.json({ contacts });
    } catch (error) {
      logger.error('Error in DirectoryController.searchContacts:', error);
      return res.status(500).json({
        error: 'Failed to search contacts',
      });
    }
  }
}
