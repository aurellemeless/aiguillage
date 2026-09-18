// Statuses for which a follow-up makes sense (waiting on a response),
// mirroring tracker/tracker_cli.py's PENDING_STATUSES.
const PENDING_STATUSES = new Set(['sent']);

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

function addBusinessDays(start: Date, days: number): Date {
	const result = new Date(start);
	let added = 0;
	while (added < days) {
		result.setDate(result.getDate() + 1);
		const day = result.getDay();
		if (day !== 0 && day !== 6) added++;
	}
	return result;
}

// YYYY-MM-DD `days` business days after `referenceDate` (also YYYY-MM-DD) —
// used to persist `applications.next_followup_date` on creation and every
// time a follow-up is logged or the delay is changed.
export function computeNextFollowupDate(referenceDate: string, days: number): string | null {
	const start = new Date(referenceDate);
	if (Number.isNaN(start.getTime())) return null;
	return addBusinessDays(start, days).toISOString().slice(0, 10);
}

// `nextFollowupDate` is the source of truth once set (by insertion, a logged
// follow-up, or a delay change). Applications from before this existed have
// it as null, so we fall back to the original live calculation from
// applicationDate for those, without needing a backfill migration.
export function isFollowupDue(
	status: string,
	applicationDate: string | null,
	followupDelayDays: number,
	nextFollowupDate: string | null = null
): boolean {
	if (!PENDING_STATUSES.has(status)) return false;
	const today = new Date().toISOString().slice(0, 10);

	if (nextFollowupDate) return nextFollowupDate <= today;

	if (!applicationDate) return false;
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

export function applicationSlug(company: string, role: string, date?: string): string {
	return `${date ?? new Date().toISOString().slice(0, 10)}_${slugify(company)}_${slugify(role)}`;
}
