// Statuses for which a follow-up makes sense (waiting on a response),
// mirroring tracker/tracker_cli.py's PENDING_STATUSES.
const PENDING_STATUSES = new Set(['Envoyé']);

function businessDaysBetween(start: Date, end: Date): number {
	if (start >= end) return 0;
	let days = 0;
	const current = new Date(start);
	while (current < end) {
		current.setDate(current.getDate() + 1);
		const day = current.getDay();
		if (day !== 0 && day !== 6) days++;
	}
	return days;
}

export function isFollowupDue(
	status: string,
	applicationDate: string | null,
	followupDelayDays: number
): boolean {
	if (!PENDING_STATUSES.has(status) || !applicationDate) return false;
	const start = new Date(applicationDate);
	if (Number.isNaN(start.getTime())) return false;
	return businessDaysBetween(start, new Date()) >= followupDelayDays;
}

export function slugify(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // strip diacritics
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '');
}

export function applicationSlug(company: string, role: string): string {
	const date = new Date().toISOString().slice(0, 10);
	return `${date}_${slugify(company)}_${slugify(role)}`;
}
