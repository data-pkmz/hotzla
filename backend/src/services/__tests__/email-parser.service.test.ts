/// <reference types="jest" />

import { EmailParserService } from '../email-parser.service';

describe('EmailParserService', () => {
  describe('extractOrderNumber', () => {
    it('should extract YYYY-NNNN order number', () => {
      expect(EmailParserService.extractOrderNumber('אישור תקציבי נדרש להזמנה 2026-1004')).toBe(
        '2026-1004'
      );
    });

    it('should extract legacy ORD order number', () => {
      expect(EmailParserService.extractOrderNumber('RE: Order ORD-1004')).toBe('ORD-1004');
    });

    it('should return undefined when no order number exists', () => {
      expect(EmailParserService.extractOrderNumber('Hello')).toBeUndefined();
    });
  });

  describe('cleanReplyBody', () => {
    it('should remove Outlook English quoted content', () => {
      const body = `
מאושר

בברכה,
ישראל ישראלי

From: Hotzla <hotzla@example.com>
Sent: Monday, August 31, 2026
To: budget@example.com
Subject: אישור תקציבי להזמנה 2026-1004

השב למייל זה במילה "מאושר"
`;

      const result = EmailParserService.cleanReplyBody(body);

      expect(result).toContain('מאושר');
      expect(result).toContain('ישראל ישראלי');

      expect(result).not.toContain('From:');
      expect(result).not.toContain('השב למייל זה במילה "מאושר"');
    });

    it('should remove Outlook Hebrew quoted content', () => {
      const body = `
נדחה

מאת: Hotzla <hotzla@example.com>
נשלח: יום שני
אל: budget@example.com
נושא: הזמנה 2026-1004

מאושר
`;

      const result = EmailParserService.cleanReplyBody(body);

      expect(result).toBe('נדחה');
    });

    it('should remove lines beginning with >', () => {
      const body = `
approved
> Original message
> reply with approved
`;

      expect(EmailParserService.cleanReplyBody(body)).toBe('approved');
    });
  });

  describe('detectDecision', () => {
    it.each(['approved', 'APPROVED', 'approves', 'מאשר', 'מאושר'])(
      'should detect approval keyword "%s"',
      (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('APPROVED');
      }
    );

    it.each(['rejected', 'REJECTED', 'rejects', 'דוחה', 'נדחה'])(
      'should detect rejection keyword "%s"',
      (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('REJECTED');
      }
    );

    it('should return UNKNOWN if neither decision is present', () => {
      expect(EmailParserService.detectDecision('I will check this later')).toBe('UNKNOWN');
    });

    it('should return UNKNOWN if both approval and rejection are present', () => {
      expect(EmailParserService.detectDecision('Previously rejected but now approved')).toBe(
        'UNKNOWN'
      );
    });

    it('should not match approved as part of a larger English word', () => {
      expect(EmailParserService.detectDecision('preapproved')).toBe('UNKNOWN');
    });
  });

  describe('parse', () => {
    it('should parse a valid Hebrew approval reply', () => {
      const result = EmailParserService.parse({
        senderEmail: ' Budget.Officer@IDF.IL ',
        subject: 'RE: אישור תקציבי נדרש להזמנה 2026-1004',
        body: `
מאושר

From: Hotzla <hotzla@example.com>
Subject: אישור תקציבי

השב במילה מאושר
`,
      });

      expect(result).toEqual({
        senderEmail: 'budget.officer@idf.il',
        subject: 'RE: אישור תקציבי נדרש להזמנה 2026-1004',
        body: expect.any(String),
        cleanedBody: 'מאושר',
        orderNumber: '2026-1004',
        decision: 'APPROVED',
      });
    });

    it('should find order number in quoted body when subject does not contain it', () => {
      const result = EmailParserService.parse({
        senderEmail: 'budget@example.com',
        subject: 'RE: אישור',
        body: `
מאושר

From: Hotzla
Subject: אישור תקציבי להזמנה 2026-1004
`,
      });

      expect(result.orderNumber).toBe('2026-1004');
      expect(result.decision).toBe('APPROVED');
    });

    it('should not detect approval from quoted original email', () => {
      const result = EmailParserService.parse({
        senderEmail: 'budget@example.com',
        subject: 'RE: הזמנה 2026-1004',
        body: `
אבדוק את הנושא

From: Hotzla
Subject: אישור תקציבי

השב למייל זה במילה "מאושר"
`,
      });

      expect(result.decision).toBe('UNKNOWN');
    });
  });
});
