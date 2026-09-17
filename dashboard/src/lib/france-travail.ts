// Client for France Travail's official, free "Offres d'emploi" API
// (https://francetravail.io). Requires a client_id/client_secret from an app
// registered on francetravail.io — see README for the registration steps.
// There is no comparable public API for APEC: when APEC shares postings with
// France Travail, they surface here already, so this is the only source
// wired up for offer discovery.

const TOKEN_URL = 'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire';
const SEARCH_URL = 'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';
const SCOPE = 'api_offresdemploiv2 o2dsoffre';

export interface RawOffer {
	externalId: string;
	title: string;
	company: string | null;
	location: string | null;
	contractType: string | null;
	postedDate: string | null;
	url: string | null;
	rawText: string;
}

export function isFranceTravailConfigured(): boolean {
	return !!process.env.FRANCE_TRAVAIL_CLIENT_ID && !!process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
}

// `res.ok` is true for 204 No Content too (a real response France Travail
// sends for an empty result set), and `res.json()` throws an opaque
// "Unexpected end of JSON input" on an empty body — parse defensively so an
// empty-but-successful response reads as "nothing here", and a genuinely
// malformed body surfaces the raw text instead of a cryptic native error.
async function safeJson(res: Response): Promise<unknown> {
	const text = await res.text();
	if (!text.trim()) return null;
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(`France Travail : réponse inattendue (HTTP ${res.status}) : ${text.slice(0, 300)}`);
	}
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
	if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.value;

	const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
	const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;
	if (!clientId || !clientSecret) {
		throw new Error('France Travail : FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET non configurés.');
	}

	const res = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: clientId,
			client_secret: clientSecret,
			scope: SCOPE,
		}),
	});
	if (!res.ok) {
		throw new Error(`France Travail : échec de l'authentification (HTTP ${res.status}).`);
	}
	const data = await safeJson(res);
	if (!data || typeof data !== 'object' || typeof (data as Record<string, unknown>).access_token !== 'string') {
		throw new Error("France Travail : réponse d'authentification invalide (pas de jeton renvoyé).");
	}
	const { access_token: accessToken, expires_in: expiresIn } = data as { access_token: string; expires_in?: number };
	cachedToken = { value: accessToken, expiresAt: Date.now() + (expiresIn ?? 1200) * 1000 };
	return cachedToken.value;
}

function offerText(offer: Record<string, unknown>): string {
	const parts = [
		offer.intitule,
		offer.entreprise && typeof offer.entreprise === 'object' ? (offer.entreprise as Record<string, unknown>).nom : null,
		offer.lieuTravail && typeof offer.lieuTravail === 'object' ? (offer.lieuTravail as Record<string, unknown>).libelle : null,
		offer.typeContratLibelle,
		offer.experienceLibelle,
		offer.salaire && typeof offer.salaire === 'object' ? (offer.salaire as Record<string, unknown>).libelle : null,
		offer.description,
	];
	return parts.filter((p) => typeof p === 'string' && p.trim()).join('\n\n');
}

function normalize(offer: Record<string, unknown>): RawOffer | null {
	const id = offer.id;
	if (typeof id !== 'string' || !id) return null;
	const lieu = (offer.lieuTravail as Record<string, unknown> | undefined) ?? {};
	const entreprise = (offer.entreprise as Record<string, unknown> | undefined) ?? {};
	const origine = (offer.origineOffre as Record<string, unknown> | undefined) ?? {};
	return {
		externalId: id,
		title: typeof offer.intitule === 'string' ? offer.intitule : 'Offre sans titre',
		company: typeof entreprise.nom === 'string' ? entreprise.nom : null,
		location: typeof lieu.libelle === 'string' ? lieu.libelle : null,
		contractType: typeof offer.typeContratLibelle === 'string' ? offer.typeContratLibelle : null,
		postedDate: typeof offer.dateCreation === 'string' ? offer.dateCreation : null,
		url: typeof origine.urlOrigine === 'string' ? origine.urlOrigine : null,
		rawText: offerText(offer),
	};
}

export interface SearchParams {
	keywords: string[];
	location?: string | null;
	radiusKm?: number | null;
	max?: number;
}

// France Travail's `commune` filter needs an INSEE code, not a free-text
// place name — resolving that would need a separate geocoding call. For v1
// we pass the location as free text into `motsCles` instead (works
// reasonably well since most postings mention their city in the text the
// API indexes), and revisit dedicated location filtering if it proves
// imprecise in practice.
export async function searchOffers({ keywords, location, max = 20 }: SearchParams): Promise<RawOffer[]> {
	const token = await getAccessToken();
	const motsCles = [...keywords, ...(location ? [location] : [])].join(' ');
	const params = new URLSearchParams({
		motsCles,
		range: `0-${Math.max(0, Math.min(max, 150) - 1)}`,
		sort: '1', // most recent first
	});

	const res = await fetch(`${SEARCH_URL}?${params.toString()}`, {
		headers: { Authorization: `Bearer ${token}` },
	});
	// The search endpoint uses 206 (partial content) for a normal paginated
	// result and 204 (no content, empty body) when nothing matches at all.
	if (res.status === 204) return [];
	if (!res.ok && res.status !== 206) {
		throw new Error(`France Travail : échec de la recherche (HTTP ${res.status}).`);
	}
	const data = await safeJson(res);
	const results =
		data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).resultats)
			? ((data as Record<string, unknown>).resultats as Record<string, unknown>[])
			: [];
	return results.map(normalize).filter((o: RawOffer | null): o is RawOffer => o !== null);
}
