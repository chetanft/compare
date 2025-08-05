/**
 * Utility function to conditionally join CSS class names
 * @param classes - CSS class names to join
 * @returns Joined class names string
 */
export function classNames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
} 