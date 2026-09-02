import type { EmailDecision, ParsedInboundEmail } from 'shared-types';

interface ParseEmailInput {
  senderEmail: string;
  subject?: string | null;
  body?: string | null;
}

export class EmailParserService {
  private static readonly APPROVAL_KEYWORDS = ['approved', 'approves', 'מאשר', 'מאושר'];

  private static readonly REJECTION_KEYWORDS = ['rejected', 'rejects', 'דוחה', 'נדחה'];

  /**
   * Parses the parts of an inbound email that are relevant to
   * budget approval processing.
   */
  static parse(input: ParseEmailInput): ParsedInboundEmail {
    const subject = input.subject?.trim() ?? '';
    const body = input.body ?? '';

    const cleanedBody = this.cleanReplyBody(body);

    const orderNumber = this.extractOrderNumber(subject) ?? this.extractOrderNumber(body);

    const decision = this.detectDecision(cleanedBody);

    return {
      senderEmail: this.normalizeEmail(input.senderEmail),
      subject,
      body,
      cleanedBody,
      orderNumber,
      decision,
    };
  }

  /**
   * Extracts Hotzla order numbers.
   *
   * Supports:
   * 2026-1004
   * ORD-1004
   */
  static extractOrderNumber(value: string): string | undefined {
    const patterns = [/\b\d{4}-\d{4}\b/i, /\bORD-\d+\b/i];

    for (const pattern of patterns) {
      const match = value.match(pattern);

      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Removes quoted email content before keyword detection.
   *
   * This is especially important because the original Hotzla
   * approval email itself contains the word "מאושר".
   */
  static cleanReplyBody(body: string): string {
    const normalized = body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const lines = normalized.split('\n');

    const cleanedLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (this.isQuotedMessageStart(trimmed)) {
        break;
      }

      if (trimmed.startsWith('>')) {
        continue;
      }

      cleanedLines.push(line);
    }

    return cleanedLines
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Determines whether the current reply indicates approval,
   * rejection or neither.
   *
   * If both approval and rejection keywords are found,
   * UNKNOWN is returned so we do not make an unsafe automatic
   * status change.
   */
  static detectDecision(body: string): EmailDecision {
    const normalizedBody = body.toLocaleLowerCase();

    const hasApproval = this.APPROVAL_KEYWORDS.some((keyword) =>
      this.containsKeyword(normalizedBody, keyword)
    );

    const hasRejection = this.REJECTION_KEYWORDS.some((keyword) =>
      this.containsKeyword(normalizedBody, keyword)
    );

    if (hasApproval && !hasRejection) {
      return 'APPROVED';
    }

    if (hasRejection && !hasApproval) {
      return 'REJECTED';
    }

    return 'UNKNOWN';
  }

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static containsKeyword(body: string, keyword: string): boolean {
    if (/^[a-z]+$/i.test(keyword)) {
      const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      return new RegExp(`\\b${escapedKeyword}\\b`, 'i').test(body);
    }

    return body.includes(keyword);
  }

  private static isQuotedMessageStart(line: string): boolean {
    const separators = [
      /^-----\s*original message\s*-----$/i,

      /^from:/i,
      /^sent:/i,
      /^to:/i,
      /^subject:/i,

      /^מאת:/,
      /^נשלח:/,
      /^אל:/,
      /^נושא:/,

      /^בתאריך .* כתב:/,
      /^on .* wrote:$/i,
    ];

    return separators.some((pattern) => pattern.test(line));
  }
}
