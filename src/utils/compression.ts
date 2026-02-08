import LZString from 'lz-string';

/**
 * Compress a text string to a Base64-encoded LZ-compressed string.
 * Safe for storage in PostgreSQL text columns.
 */
export function compressText(text: string): string {
  return LZString.compressToBase64(text);
}

/**
 * Decompress a Base64-encoded LZ-compressed string back to the original text.
 * Returns null if decompression fails.
 */
export function decompressText(compressed: string): string | null {
  return LZString.decompressFromBase64(compressed);
}

/**
 * Check if a string looks like compressed content vs raw YAML.
 * Raw YAML starts with known patterns (id:, ---, #, nodes:, etc).
 */
export function isCompressed(text: string): boolean {
  const trimmed = text.trimStart();
  if (
    trimmed.startsWith('id:') ||
    trimmed.startsWith('---') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('- id:') ||
    trimmed.startsWith('nodes:')
  ) {
    return false;
  }
  // Try decompressing — if it returns valid text, it was compressed
  try {
    const result = LZString.decompressFromBase64(trimmed);
    return result !== null && result.length > 0;
  } catch {
    return false;
  }
}

/**
 * Decompress if compressed, otherwise return as-is.
 * Enables transparent migration from uncompressed to compressed storage.
 */
export function decompressTextSafe(text: string): string {
  if (isCompressed(text)) {
    return LZString.decompressFromBase64(text) ?? text;
  }
  return text;
}
