import EWS from 'node-ews';
import type { ContactItem } from 'shared-types';
import logger from '../utils/logger';

interface EwsMailbox {
  Name?: string;
  EmailAddress?: string;
}

interface EwsContact {
  DisplayName?: string;
  Department?: string;
  JobTitle?: string;
}

interface EwsResolution {
  Mailbox?: EwsMailbox;
  Contact?: EwsContact;
}

interface EwsResolveNamesResponse {
  ResponseMessages?: {
    ResolveNamesResponseMessage?: {
      ResolutionSet?: {
        Resolution?: EwsResolution | EwsResolution[];
      };
    };
  };
}

const MOCK_CONTACTS: ContactItem[] = [
  {
    displayName: 'רס״ן ישראל ישראלי',
    email: 'israel.israeli@idfts.il',
    department: 'מדור תקציבים - אט״ל',
    title: 'קצין תקציבים',
  },
  {
    displayName: 'סרן דוד כהן',
    email: 'david.cohen@idfts.il',
    department: 'ענף תקציבים - חיל האוויר',
    title: 'עוזר קצין תקציב',
  },
  {
    displayName: 'רס״ן מיכל אברהם',
    email: 'michal.avraham@idfts.il',
    department: 'מחלקת תקציבים וכלכלה',
    title: 'קצינת תקציב מאשרת',
  },
  {
    displayName: 'רס״ן יוני לוי',
    email: 'yoni.levi@idfts.il',
    department: 'תקציבי רכש והצטיידות',
    title: 'קצין תקציב יחידתי',
  },
  {
    displayName: 'סרן נועה שרון',
    email: 'noa.sharon@idfts.il',
    department: 'מנהלת תקציבים - פיקוד',
    title: 'קצינת אישור תקציבי',
  },
];

export class DirectoryService {
  private ews: EWS | null = null;

  /**
   * Lazily initializes and returns the EWS client instance.
   * Configures SSL/TLS validation bypass so that internal intranet/self-signed
   * Exchange certificates work without requiring a root CA installation.
   */
  private getEwsClient(): EWS {
    if (this.ews) {
      return this.ews;
    }

    const host = process.env.EXCHANGE_HOST || '';
    const username = process.env.EXCHANGE_SVC_USER || '';
    const password = process.env.EXCHANGE_SVC_PASSWORD || '';
    const domain = process.env.EXCHANGE_DOMAIN;
    const authType = (process.env.EXCHANGE_AUTH as 'ntlm' | 'basic') || 'ntlm';

    // When rejectUnauthorized is false, disable strict SSL verification
    // to allow connecting to internal intranet Exchange servers without root cert issues.
    const rejectUnauthorized = process.env.EXCHANGE_REJECT_UNAUTHORIZED === 'true';

    if (!rejectUnauthorized) {
      // Disables TLS rejection for internal network requests
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    this.ews = new EWS(
      {
        host,
        username,
        password,
        auth: authType,
        domain,
      },
      {
        rejectUnauthorized,
        strictSSL: rejectUnauthorized,
      }
    );

    return this.ews;
  }

  /**
   * Searches organizational contacts via Exchange Web Services (GAL / Active Directory)
   * or returns matching test contacts in development/mock mode.
   *
   * @param query The search term (at least 2 characters)
   */
  async searchContacts(query: string): Promise<ContactItem[]> {
    const cleanQuery = query?.trim() ?? '';
    if (cleanQuery.length < 2) {
      return [];
    }

    // In mock mode or when no Exchange host is configured, return mock contacts
    const isMock = process.env.AUTH_MODE === 'mock' || !process.env.EXCHANGE_HOST;
    if (isMock) {
      const lowerQuery = cleanQuery.toLowerCase();
      return MOCK_CONTACTS.filter((contact) => {
        return (
          contact.displayName.toLowerCase().includes(lowerQuery) ||
          contact.email.toLowerCase().includes(lowerQuery) ||
          (contact.department && contact.department.toLowerCase().includes(lowerQuery))
        );
      });
    }

    const ewsArgs: Record<string, unknown> = {
      attributes: {
        ReturnFullContactData: 'true',
        SearchScope: 'ActiveDirectory',
      },
      UnresolvedEntry: cleanQuery,
    };

    try {
      const client = this.getEwsClient();
      const rawResponse = (await client.run('ResolveNames', ewsArgs)) as EwsResolveNamesResponse;

      const resolutions =
        rawResponse?.ResponseMessages?.ResolveNamesResponseMessage?.ResolutionSet?.Resolution;

      if (!resolutions) {
        return [];
      }

      const list: EwsResolution[] = Array.isArray(resolutions) ? resolutions : [resolutions];

      return list
        .map((item) => {
          const email = item.Mailbox?.EmailAddress?.trim() || '';
          const displayName =
            item.Contact?.DisplayName?.trim() || item.Mailbox?.Name?.trim() || email;
          const department = item.Contact?.Department?.trim() || undefined;
          const title = item.Contact?.JobTitle?.trim() || undefined;

          return {
            displayName,
            email,
            department,
            title,
          };
        })
        .filter((c) => Boolean(c.email && c.email.includes('@')))
        .slice(0, 15);
    } catch (error) {
      logger.error('Failed to search organizational contacts via EWS:', {
        query: cleanQuery,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error('Directory search failed', { cause: error });
    }
  }
}

export const directoryService = new DirectoryService();
