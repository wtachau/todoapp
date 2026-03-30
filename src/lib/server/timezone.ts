// TODO: make this configurable per user or per generator
export const DEFAULT_TIMEZONE = 'America/Los_Angeles';

export function startOfDayInTimezone(date: Date, timezone: string): Date {
	const localDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(date);
	const utcMidnight = new Date(localDateStr + 'T00:00:00Z');
	const localTime = new Date(utcMidnight.toLocaleString('en-US', { timeZone: timezone }));
	const offsetMs = localTime.getHours() * 3_600_000 + localTime.getMinutes() * 60_000;
	const msToAdd = offsetMs > 0 ? 24 * 3_600_000 - offsetMs : -offsetMs;
	return new Date(utcMidnight.getTime() + msToAdd);
}
