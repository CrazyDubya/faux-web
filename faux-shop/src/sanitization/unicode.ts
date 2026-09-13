// Unicode sanitization - defense against invisible characters and homoglyphs
import type { SanitizationFlags, SanitizationStage } from './types';

// Dangerous Unicode ranges that should be removed
const DANGEROUS_UNICODE = [
  /[\u200B-\u200F]/g, // Zero-width characters
  /[\u2060-\u2064]/g, // Word joiner, invisible times, etc.
  /[\uFEFF]/g,        // Byte order mark
  /[\u202A-\u202E]/g, // Bidirectional text controls (RLO, LRO, etc.)
  /[\u2066-\u2069]/g, // Additional bidi controls
  /[\u00AD]/g,        // Soft hyphen
  /[\u034F]/g,        // Combining grapheme joiner
  /[\u2028-\u2029]/g, // Line/paragraph separator
  /[\u0000-\u001F]/g, // Control characters (except common ones handled separately)
  /[\u007F-\u009F]/g, // Delete and C1 controls
];

// Characters that look like ASCII but aren't (homoglyphs)
const HOMOGLYPH_MAP: Record<string, string> = {
  '\u0430': 'a', // Cyrillic а
  '\u0435': 'e', // Cyrillic е
  '\u043E': 'o', // Cyrillic о
  '\u0440': 'p', // Cyrillic р
  '\u0441': 'c', // Cyrillic с
  '\u0445': 'x', // Cyrillic х
  '\u0443': 'y', // Cyrillic у
  '\u0456': 'i', // Cyrillic і
  '\u0458': 'j', // Cyrillic ј
  '\u04BB': 'h', // Cyrillic һ
  '\u2010': '-', // Hyphen
  '\u2011': '-', // Non-breaking hyphen
  '\u2212': '-', // Minus sign
  '\uFF0D': '-', // Fullwidth hyphen-minus
  '\u2018': "'", // Left single quote
  '\u2019': "'", // Right single quote
  '\u201C': '"', // Left double quote
  '\u201D': '"', // Right double quote
  '\uFF02': '"', // Fullwidth quotation mark
  '\u2024': '.', // One dot leader
  '\uFF0E': '.', // Fullwidth full stop
};

export function filterDangerousUnicode(input: string, flags: SanitizationFlags): { output: string; stage: SanitizationStage } {
  let output = input;
  let modificationsCount = 0;
  const details: Record<string, number> = {};

  // Remove dangerous Unicode ranges
  for (const pattern of DANGEROUS_UNICODE) {
    const matches = output.match(pattern);
    if (matches) {
      details[pattern.source] = matches.length;
      modificationsCount += matches.length;
      flags.unicodeAnomalies = true;
    }
    output = output.replace(pattern, '');
  }

  // Replace homoglyphs
  for (const [homoglyph, replacement] of Object.entries(HOMOGLYPH_MAP)) {
    const regex = new RegExp(homoglyph, 'g');
    const matches = output.match(regex);
    if (matches) {
      details[`homoglyph_${homoglyph}`] = matches.length;
      modificationsCount += matches.length;
      flags.unicodeAnomalies = true;
    }
    output = output.replace(regex, replacement);
  }

  return {
    output,
    stage: {
      name: 'codepoint_filter',
      applied: true,
      modificationsCount,
      details: Object.keys(details).length > 0 ? details : undefined,
    },
  };
}

export function normalizeUnicode(input: string): { output: string; stage: SanitizationStage } {
  // NFKC normalization - most aggressive, collapses compatibility characters
  const output = input.normalize('NFKC');

  return {
    output,
    stage: {
      name: 'normalization',
      applied: true,
      modificationsCount: input.length !== output.length ? 1 : 0,
    },
  };
}

export function validateBytes(input: string): { valid: boolean; stage: SanitizationStage } {
  // Check for null bytes and other invalid sequences
  const hasNull = input.includes('\0');
  const hasInvalidUtf8 = /[\uFFFD]/.test(input); // Replacement character indicates bad encoding

  return {
    valid: !hasNull && !hasInvalidUtf8,
    stage: {
      name: 'byte_validation',
      applied: true,
      modificationsCount: 0,
      details: {
        hasNull,
        hasInvalidUtf8,
      },
    },
  };
}
