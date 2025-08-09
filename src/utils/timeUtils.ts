/**
 * Formats a duration in seconds to a user-friendly string (e.g., "2h 15m" or "45m")
 */
export const formatDuration = (seconds: number): string => {
  if (seconds <= 0) return '0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}; 

/**
 * Formats seconds as a clock string.
 * If < 1 hour: mm:ss
 * If >= 1 hour: hh:mm:ss
 */
export const formatClock = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  }
  return `${pad(minutes)}:${pad(secs)}`;
};

/**
 * Returns a YYYY-MM-DD string for the current date in America/Toronto time.
 */
export const getTorontoDateString = (): string => {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [{ value: year }, , { value: month }, , { value: day }] = fmt.formatToParts(new Date());
    return `${year}-${month}-${day}`;
  } catch {
    // Fallback to local date if Intl with timezone is unavailable
    const d = new Date();
    const y = d.getFullYear();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};