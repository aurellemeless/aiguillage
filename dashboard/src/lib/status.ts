import { Status } from './types';

const STAMP_CLASS: Record<Status, string> = {
	Brouillon: 'brouillon',
	Envoyé: 'envoye',
	'Réponse reçue': 'reponse',
	'Entretien RH': 'entretien',
	'Entretien technique': 'entretien',
	'Offre reçue': 'offre',
	Refusé: 'refuse',
	'Sans réponse/Abandonné': 'refuse',
};

export function stampClassForStatus(status: string): string {
	return STAMP_CLASS[status as Status] ?? 'brouillon';
}

export function daysSince(dateStr: string | null): number | null {
	if (!dateStr) return null;
	const start = new Date(dateStr);
	if (Number.isNaN(start.getTime())) return null;
	const ms = Date.now() - start.getTime();
	return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function formatDateFr(dateStr: string | null): string {
	if (!dateStr) return '—';
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTimeFr(dateStr: string): string {
	const d = new Date(dateStr);
	if (Number.isNaN(d.getTime())) return dateStr;
	return d.toLocaleString('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}
