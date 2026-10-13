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

      expect(EmailParserService.cleanReplyBody(body)).toBe('נדחה');
    });

    it('should remove lines beginning with >', () => {
      const body = `
approved
> Original message
> reply with approved
`;

      expect(EmailParserService.cleanReplyBody(body)).toBe('approved');
    });

    it('should normalize line endings', () => {
      const body = 'מאושר\r\n\r\nFrom: Hotzla\r\nנדחה';

      expect(EmailParserService.cleanReplyBody(body)).toBe('מאושר');
    });
  });

  describe('detectDecision', () => {
    describe('approval', () => {
      it.each([
        'approved',
        'APPROVED',
        'approves',
        'approve',
        'I approve this order',
        'We approved the order',
        'מאשר',
        'מאשרת',
        'מאשרים',
        'מאושר',
        'מאושרת',
        'אני מאשר את ההזמנה',
        'ההזמנה מאושרת',
      ])('should detect approval: "%s"', (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('APPROVED');
      });
    });

    describe('rejection', () => {
      it.each([
        'rejected',
        'REJECTED',
        'rejects',
        'reject',
        'declined',
        'I reject this order',
        'The order is rejected',
        'דוחה',
        'דוחים',
        'נדחה',
        'נדחתה',
        'אני דוחה את ההזמנה',
        'ההזמנה נדחתה',
      ])('should detect rejection: "%s"', (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('REJECTED');
      });
    });

    describe('negated approval', () => {
      it.each([
        'not approved',
        'NOT APPROVED',
        'Not Approved',
        'not approve',
        'do not approve',
        "don't approve",
        'does not approve',
        "doesn't approve",
        'cannot approve',
        "can't approve",
        'will not approve',
        "won't approve",
        'unable to approve',
        'I do not approve this order',
        'The order is not approved',
        'לא מאשר',
        'לא מאשרת',
        'לא מאשרים',
        'לא מאושר',
        'לא מאושרת',
        'לא לאשר',
        'אינו מאושר',
        'אינה מאושרת',
        'אין אישור',
        'לא ניתן לאשר',
        'אני לא מאשר את ההזמנה',
      ])('should reject negated approval: "%s"', (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('REJECTED');
      });

      it('should handle English negation across newlines', () => {
        expect(EmailParserService.detectDecision('not\napproved')).toBe('REJECTED');
      });

      it('should handle Hebrew negation with multiple spaces', () => {
        expect(EmailParserService.detectDecision('לא    מאשר')).toBe('REJECTED');
      });

      it('should not count the approval word inside negation', () => {
        expect(EmailParserService.detectDecision('This order is not approved')).toBe('REJECTED');
      });
    });

    describe('negated rejection', () => {
      it.each([
        'not rejected',
        'not reject',
        'do not reject',
        "don't reject",
        'cannot reject',
        'לא דוחה',
        'לא נדחה',
        'לא נדחתה',
        'אינו נדחה',
      ])('should return UNKNOWN for negated rejection: "%s"', (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('UNKNOWN');
      });
    });

    describe('contradictory decisions', () => {
      it.each([
        'Previously rejected but now approved',
        'approved but rejected',
        'rejected but approved',
        'approved but not approved',
        "I approved earlier but now I don't approve",
        'approved, rejected',
        'מאושר אבל נדחה',
        'מאשר אבל לא מאשר',
        'נדחה אבל מאושר',
        'לא מאושר אבל מאשר',
      ])('should return UNKNOWN for contradiction: "%s"', (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('UNKNOWN');
      });
    });

    describe('questions and uncertainty', () => {
      it.each([
        'Can you approve this?',
        'Approved?',
        'Is this approved?',
        'Do you approve?',
        'האם ההזמנה מאושרת?',
        'מאשר?',
        'maybe approved',
        'perhaps approved',
        'probably approved',
        'tentatively approved',
        'approved if the price is correct',
        'approved unless something changes',
        'cannot approve yet',
        'not yet approved',
        'אולי מאושר',
        'מאושר אם הכל תקין',
      ])('should return UNKNOWN for uncertain message: "%s"', (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('UNKNOWN');
      });

      it.each([
        '',
        ' ',
        'Hello',
        'Thank you',
        'I will check this later',
        'אבדוק את הנושא',
        'תודה רבה',
        'Please review the order',
      ])('should return UNKNOWN without a decision: "%s"', (body) => {
        expect(EmailParserService.detectDecision(body)).toBe('UNKNOWN');
      });
    });

    describe('keyword boundaries', () => {
      it('should not match approved inside a larger word', () => {
        expect(EmailParserService.detectDecision('preapproved')).toBe('UNKNOWN');
      });

      it('should not match rejected inside a larger word', () => {
        expect(EmailParserService.detectDecision('unrejected')).toBe('UNKNOWN');
      });

      it('should not match Hebrew approval inside a larger word', () => {
        expect(EmailParserService.detectDecision('ומאושר')).toBe('UNKNOWN');
      });
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

    it('should find order number in quoted body', () => {
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

    it('should reject despite approval in quoted content', () => {
      const result = EmailParserService.parse({
        senderEmail: 'budget@example.com',
        subject: 'RE: הזמנה 2026-1004',
        body: `
לא מאושר

From: Hotzla
Subject: אישור תקציבי

השב למייל זה במילה "מאושר"
`,
      });

      expect(result.cleanedBody).toBe('לא מאושר');
      expect(result.decision).toBe('REJECTED');
    });

    it('should ignore quoted rejection after new approval', () => {
      const result = EmailParserService.parse({
        senderEmail: 'budget@example.com',
        subject: 'RE: Order 2026-1004',
        body: `
Approved

> Previously rejected
> Original message
`,
      });

      expect(result.decision).toBe('APPROVED');
    });

    it('should not infer approval from the subject alone', () => {
      const result = EmailParserService.parse({
        senderEmail: 'budget@example.com',
        subject: 'RE: Approved order 2026-1004',
        body: 'I will review this tomorrow',
      });

      expect(result.orderNumber).toBe('2026-1004');
      expect(result.decision).toBe('UNKNOWN');
    });

    it('should normalize sender email', () => {
      const result = EmailParserService.parse({
        senderEmail: ' OFFICER@IDF.IL ',
        subject: '2026-1004',
        body: 'approved',
      });

      expect(result.senderEmail).toBe('officer@idf.il');
    });
  });
});
