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
