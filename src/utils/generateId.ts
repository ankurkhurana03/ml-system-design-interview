/**
 * Generate a URL-safe ID from a text string.
 * Useful for creating problem IDs from titles or descriptions.
 *
 * @param text - The text to convert to an ID
 * @returns A lowercase, hyphenated ID string
 *
 * @example
 * generateId("Fraud Detection System") // => "fraud-detection-system"
 * generateId("Build a Recommendation Engine!") // => "build-a-recommendation-engine"
 */
export function generateId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // Remove special characters except spaces and hyphens
    .replace(/[^\w\s-]/g, '')
    // Replace spaces and multiple hyphens with single hyphen
    .replace(/[\s_-]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit length to 50 characters
    .substring(0, 50)
    // Remove trailing hyphen if substring cut off mid-word
    .replace(/-$/, '');
}

/**
 * Generate a unique ID by appending a timestamp or random suffix.
 *
 * @param text - The base text for the ID
 * @param mode - 'timestamp' for time-based, 'random' for random suffix
 * @returns A unique ID string
 *
 * @example
 * generateUniqueId("fraud-detection") // => "fraud-detection-1709123456"
 * generateUniqueId("fraud-detection", 'random') // => "fraud-detection-x7k2m"
 */
export function generateUniqueId(text: string, mode: 'timestamp' | 'random' = 'timestamp'): string {
  const baseId = generateId(text);

  if (mode === 'timestamp') {
    const timestamp = Math.floor(Date.now() / 1000);
    return `${baseId}-${timestamp}`;
  } else {
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    return `${baseId}-${randomSuffix}`;
  }
}
