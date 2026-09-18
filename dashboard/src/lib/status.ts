import { Status } from './types';
import { Locale } from './i18n';

const STAMP_CLASS: Record<Status, string> = {
	draft: 'draft',
	sent: 'sent',
	response_received: 'response_received',
	hr_interview: 'interview',
	technical_interview: 'interview',
	offer_received: 'offer',
	rejected: 'rejected',
	no_response_abandoned: 'rejected',
};

export function stampClassForStatus(status: string): string {
	return STAMP_CLASS[status as Status] ?? 'draft';
}

// One chart slot per status, in the same pipeline order STATUSES is defined
// in — pie wedges are drawn in this order too, so any two wedges that end up
// touching are an adjacent (CVD-validated) pair in the underlying palette.
const CHART_COLOR: Record<Status, string> = {
	draft: 'var(--chart-1)',
	sent: 'var(--chart-2)',
	response_received: 'var(--chart-3)',
	hr_interview: 'var(--chart-4)',
	technical_interview: 'var(--chart-5)',
	offer_received: 'var(--chart-6)',
	rejected: 'var(--chart-7)',
	no_response_abandoned: 'var(--chart-8)',
};

export function chartColorForStatus(status: string): string {
	return CHART_COLOR[status as Status] ?? 'var(--chart-1)';
}

export function daysSince(dateStr: string | null): number | null {
	if (!dateStr) return null;
	const start = new Date(dateStr);
	if (Number.isNaN(start.getTime())) return null;
	const ms = Date.now() - start.getTime();
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function intlLocale(locale: Locale): string {
	return locale === 'en' ? 'en-US' : 'fr-FR';
}

export function formatDate(dateStr: string | null, locale: Locale = 'fr'): string {
	if (!dateStr) return '—';
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	return d.toLocaleDateString(intlLocale(locale), { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function relativeTime(dateStr: string | null, locale: Locale = 'fr'): string {
	if (!dateStr) return '—';
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });
	const diffSeconds = (d.getTime() - Date.now()) / 1000;
	const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
		[60, 'second'],
		[60, 'minute'],
		[24, 'hour'],
		[7, 'day'],
		[4.34524, 'week'],
		[12, 'month'],
		[Infinity, 'year'],
	];
	let duration = diffSeconds;
	for (const [amount, unit] of divisions) {
		if (Math.abs(duration) < amount) return rtf.format(Math.round(duration), unit);
		duration /= amount;
	}
	return rtf.format(Math.round(duration), 'year');
}

export function formatDateTime(dateStr: string, locale: Locale = 'fr'): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	return d.toLocaleString(intlLocale(locale), {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}
