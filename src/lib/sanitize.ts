/**
 * Server-side input sanitization utilities.
 * Prevents XSS, SQL injection patterns, and dangerous inputs.
 */

/** Strip dangerous HTML/script characters */
export function sanitizeText(input: string, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>]/g, c => c === '<' ? '＜' : '＞');
}

/** Allow only alphanumeric + underscore for usernames */
export function sanitizeUsername(input: string): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
}

/** Validate UUID format */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** Validate YouTube URL only */
export function isValidYouTubeUrl(url: string): boolean {
  if (!url) return true; // Optional field
  return /^https?:\/\/(www\.)?(youtube\.com\/|youtu\.be\/).+/.test(url);
}

/** Block personal SNS accounts */
const BANNED_SNS_DOMAINS = [
  'twitter.com', 'x.com', 'instagram.com', 'line.me',
  'tiktok.com', 'facebook.com', 'threads.net', 'snapchat.com',
  'discord.com', 'discord.gg', 'telegram.org', 't.me',
];

export function isBannedSnsUrl(url: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return BANNED_SNS_DOMAINS.some(d => u.hostname === d || u.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/** Validate any external URL (must be https) */
export function isValidExternalUrl(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !isBannedSnsUrl(url);
  } catch {
    return false;
  }
}

/** Sanitize a number within bounds */
export function clampNumber(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}
