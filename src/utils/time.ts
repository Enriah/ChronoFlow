/**
 * Takes a timestamp and returns a new timestamp with the same HH:mm:ss 
 * but for the current day.
 */
export function alignToToday(timestamp: number): number {
  const date = new Date(timestamp);
  const now = new Date();
  
  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds()
  ).getTime();
}

/**
 * Returns today's date in YYYY-MM-DD format.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object or timestamp to YYYY-MM-DD.
 */
export function formatDate(date: Date | number): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
