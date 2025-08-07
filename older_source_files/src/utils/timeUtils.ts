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