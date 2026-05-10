/**
 * Format a number as RON currency.
 */
export function formatRON(value) {
  return `${value.toLocaleString('ro-RO')} RON`;
}

/**
 * Get initials from a name string (max 2 chars).
 */
export function getInitials(name) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Delay helper for simulating API calls.
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
