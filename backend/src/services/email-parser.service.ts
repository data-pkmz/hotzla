import type { EmailDecision, ParsedInboundEmail } from 'shared-types';

interface ParseEmailInput {
  senderEmail: string;
  subject?: string | null;
  body?: string | null;
}

export class EmailParserService {
  /**
   * Complete expressions that clearly negate approval.
   *
   * These must be recognized before searching for approval keywords.
   */
  private static readonly NEGATED_APPROVAL_PATTERNS: RegExp[] = [
    /\bnot\s+(?:approved|approve|approving)\b/iu,
    /\bdo\s+not\s+approve\b/iu,
    /\bdoes\s+not\s+approve\b/iu,
    /\bdon['’]?t\s+approve\b/iu,
    /\bdoesn['’]?t\s+approve\b/iu,
    /\b(?:cannot|can['’]?t)\s+approve\b/iu,
    /\b(?:will\s+not|won['’]?t)\s+approve\b/iu,
    /\b(?:unable|refuse)\s+to\s+approve\b/iu,

    /(?<![\p{L}\p{N}])לא\s+(?:מאשר|מאשרת|מאשרים|מאושר|מאושרת|לאשר)(?![\p{L}\p{N}])/u,
    /(?<![\p{L}\p{N}])(?:אינו|אינה|אינם)\s+(?:מאושר|מאושרת|מאושרים)(?![\p{L}\p{N}])/u,
    /(?<![\p{L}\p{N}])אין\s+אישור(?![\p{L}\p{N}])/u,
    /(?<![\p{L}\p{N}])לא\s+ניתן\s+לאשר(?![\p{L}\p{N}])/u,
  ];

  /**
   * Expressions that negate rejection.
   *
   * "Not rejected" is not equivalent to "approved".
   */
  private static readonly NEGATED_REJECTION_PATTERNS: RegExp[] = [
    /\bnot\s+(?:rejected|rejecting|reject)\b/iu,
    /\bdo\s+not\s+reject\b/iu,
    /\bdon['’]?t\s+reject\b/iu,
    /\b(?:cannot|can['’]?t)\s+reject\b/iu,

    /(?<![\p{L}\p{N}])לא\s+(?:דוחה|דוחים|נדחה|נדחתה|לדחות)(?![\p{L}\p{N}])/u,
    /(?<![\p{L}\p{N}])(?:אינו|אינה)\s+(?:נדחה|נדחתה)(?![\p{L}\p{N}])/u,
  ];

  private static readonly APPROVAL_PATTERNS: RegExp[] = [
    /\b(?:approve|approved|approves)\b/iu,

    /(?<![\p{L}\p{N}])(?:מאשר|מאשרת|מאשרים|מאושר|מאושרת|מאושרים)(?![\p{L}\p{N}])/u,
  ];

  private static readonly REJECTION_PATTERNS: RegExp[] = [
    /\b(?:reject|rejected|rejects|decline|declined)\b/iu,

    /(?<![\p{L}\p{N}])(?:דוחה|דוחים|נדחה|נדחתה)(?![\p{L}\p{N}])/u,
  ];

  /**
   * Words indicating that a decision may not be final.
   *
   * These cause UNKNOWN rather than an automatic status change.
   */
  private static readonly UNCERTAINTY_PATTERNS: RegExp[] = [
    /\b(?:maybe|perhaps|possibly|probably|tentatively)\b/iu,
    /\b(?:if|unless|pending)\b/iu,
    /\b(?:not\s+yet|for\s+now)\b/iu,
    /\b(?:cannot|can['’]?t)\s+approve\s+yet\b/iu,
    /\bnot\s+yet\s+approved\b/iu,

    /(?<![\p{L}\p{N}])(?:אולי|ייתכן|כנראה|בינתיים|בתנאי|אם)(?![\p{L}\p{N}])/u,
    /(?<![\p{L}\p{N}])(?:עדיין|טרם)\s+לא(?![\p{L}\p{N}])/u,
    /(?<![\p{L}\p{N}])לא\s+(?:מאושר|מאושרת)\s+עדיין(?![\p{L}\p{N}])/u,
    /(?<![\p{L}\p{N}])(?:עדיין|טרם)\s+(?:לא\s+)?(?:מאושר|מאושרת)(?![\p{L}\p{N}])/u,
  ];

  /**
   * Parses the parts of an inbound email that are relevant to
   * budget approval processing.
   */
  static parse(input: ParseEmailInput): ParsedInboundEmail {
    const subject = input.subject?.trim() ?? '';
    const body = input.body ?? '';

    const cleanedBody = this.cleanReplyBody(body);

    // Order numbers may legitimately appear in the quoted original email.
    const orderNumber = this.extractOrderNumber(subject) ?? this.extractOrderNumber(body);

    // Decisions must come only from the newly written reply.
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
   * Removes quoted email content before decision detection.
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
   * Classifies the entire order decision.
   *
   * IMPORTANT:
   * - A negated approval is a rejection signal.
   * - A negated rejection is NOT an approval.
   * - Conflicting signals return UNKNOWN.
   * - Questions and uncertain decisions return UNKNOWN.
   */
  static detectDecision(body: string): EmailDecision {
    const normalized = this.normalizeBody(body);

    if (!normalized) {
      return 'UNKNOWN';
    }

    // Questions are not reliable authorization decisions.
    if (/[?？؟]/u.test(normalized)) {
      return 'UNKNOWN';
    }

    if (this.matchesAny(normalized, this.UNCERTAINTY_PATTERNS)) {
      return 'UNKNOWN';
    }

    const hasNegatedApproval = this.matchesAny(normalized, this.NEGATED_APPROVAL_PATTERNS);

    const hasNegatedRejection = this.matchesAny(normalized, this.NEGATED_REJECTION_PATTERNS);

    /*
     * Remove complete negated expressions before looking for
     * standalone positive or negative keywords.
     *
     * For example:
     * "not approved" -> ""
     *
     * This prevents "approved" from being counted as an
     * independent positive decision.
     */
    const withoutNegations = this.removePatterns(normalized, [
      ...this.NEGATED_APPROVAL_PATTERNS,
      ...this.NEGATED_REJECTION_PATTERNS,
    ]);

    const hasExplicitApproval = this.matchesAny(withoutNegations, this.APPROVAL_PATTERNS);

    const hasExplicitRejection = this.matchesAny(withoutNegations, this.REJECTION_PATTERNS);

    // Any negated rejection makes the message unsafe to classify
    // automatically without more context.
    if (hasNegatedRejection) {
      return 'UNKNOWN';
    }

    const hasRejection = hasNegatedApproval || hasExplicitRejection;

    // Contradictory decisions must not change the order.
    if (hasExplicitApproval && hasRejection) {
      return 'UNKNOWN';
    }

    if (hasRejection) {
      return 'REJECTED';
    }

    if (hasExplicitApproval) {
      return 'APPROVED';
    }

    return 'UNKNOWN';
  }

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /**
   * Normalizes whitespace while preserving word boundaries.
   *
   * This handles phrases such as:
   * "not\napproved"
   * "לא    מאשר"
   */
  private static normalizeBody(body: string): string {
    return body.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  private static matchesAny(body: string, patterns: RegExp[]): boolean {
    return patterns.some((pattern) => pattern.test(body));
  }

  /**
   * Removes all occurrences of the specified expressions.
   *
   * The original patterns do not use the global flag.
   * A global copy is created only for replacement.
   */
  private static removePatterns(body: string, patterns: RegExp[]): string {
    let result = body;

    for (const pattern of patterns) {
      const globalPattern = new RegExp(
        pattern.source,
        pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`
      );

      result = result.replace(globalPattern, ' ');
    }

    return result;
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
