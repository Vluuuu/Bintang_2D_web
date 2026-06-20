export type TimeTheme = 'day' | 'sunset' | 'night';

export interface TimeRule {
  theme: TimeTheme;
  startHour: number; // Inclusive start hour
  endHour: number;   // Exclusive end hour (e.g. startHour 6, endHour 17 means 06:00 to 16:59)
}

/**
 * Rules defining active theme depending on hour of day (0-23).
 * If no rules match (e.g. wrapping over midnight), the default night theme is applied.
 */
export const timeRules: TimeRule[] = [
  { theme: 'day', startHour: 6, endHour: 17 },     // 06:00 - 16:59
  { theme: 'sunset', startHour: 17, endHour: 19 }, // 17:00 - 18:59
  // Night spans 19:00 - 05:59
];

/**
 * Determine theme based on current local hours (0-23)
 */
export function getThemeForHour(hour: number): TimeTheme {
  for (const rule of timeRules) {
    if (hour >= rule.startHour && hour < rule.endHour) {
      return rule.theme;
    }
  }
  return 'night';
}

/**
 * Gets the current TimeTheme based on device local time
 */
export function getCurrentTheme(): TimeTheme {
  const hour = new Date().getHours();
  return getThemeForHour(hour);
}

/**
 * Format local time with local timezone abbreviation (e.g., WIB, WITA, WIT or UTC offset)
 */
export function formatLocalTime(date: Date = new Date()): string {
  // Format HH:MM
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Attempt to guess timezone code for Indonesia, or fall back to native timezone formatting
  const offsetMinutes = date.getTimezoneOffset();
  const offsetHours = -offsetMinutes / 60;

  let tzSuffix = '';
  // Check if timezone is close to Indonesian ones:
  // GMT+7 = Asia/Jakarta (WIB)
  // GMT+8 = Asia/Makassar (WITA)
  // GMT+9 = Asia/Jayapura (WIT)
  if (offsetHours === 7) {
    tzSuffix = 'WIB';
  } else if (offsetHours === 8) {
    tzSuffix = 'WITA';
  } else if (offsetHours === 9) {
    tzSuffix = 'WIT';
  } else {
    // Fallback to generic UTC representation or use Intl to extract abbreviation
    try {
      const parts = new Intl.DateTimeFormat('id-ID', { timeZoneName: 'short' }).formatToParts(date);
      const tzPart = parts.find(p => p.type === 'timeZoneName');
      tzSuffix = tzPart ? tzPart.value : `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
    } catch {
      tzSuffix = `UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`;
    }
  }

  return `${timeStr} ${tzSuffix}`;
}
