export function ageColor(createdAt: Date | string, urgencyDays: number): string {
	const ageMs = Date.now() - new Date(createdAt).getTime();
	const urgencyMs = urgencyDays * 24 * 60 * 60 * 1000;
	const ratio = Math.min(ageMs / urgencyMs, 1);
	const hue = ratio < 0.5 ? 120 - ratio * 2 * 80 : 40 - (ratio - 0.5) * 2 * 40;
	const saturation = 45 + ratio * 25;
	const lightness = 42 - ratio * 10;
	return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function formatNextRun(d: Date | string): string {
	return new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function taskAge(createdAt: Date | string): string {
	const ms = Date.now() - new Date(createdAt).getTime();
	const mins = Math.floor(ms / 60000);
	if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`;
	const hours = Math.floor(mins / 60);
	if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
	const days = Math.floor(hours / 24);
	return days === 1 ? '1 day ago' : `${days} days ago`;
}
