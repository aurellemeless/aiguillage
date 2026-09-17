import { getProfileSearchSettings, insertDiscoveredOffer, offerExists, recordScanResult, recordScanStart } from './db';
import { getProfile } from './profiles';
import { assessFit } from './claude';
import { isFranceTravailConfigured, searchOffers } from './france-travail';
import { Locale } from './i18n';

// Cap the number of *new* offers assessed per scan: Claude is called once
// per new offer, so an unbounded scan on a broad search could be slow and
// costly. Offers beyond this cap are simply picked up on the next scan.
const MAX_NEW_OFFERS_PER_SCAN = 20;

export async function runScan(profileSlug: string, language: Locale = 'fr'): Promise<void> {
	recordScanStart(profileSlug);
	try {
		const profile = getProfile(profileSlug);
		if (!profile) throw new Error('Profil introuvable.');

		const settings = getProfileSearchSettings(profileSlug);
		if (settings.keywords.length === 0) {
			throw new Error("Aucun mot-clé de recherche configuré — renseigne-les dans Profil avant de scanner.");
		}
		if (!settings.sources.includes('france_travail')) {
			throw new Error('Aucune source activée.');
		}
		if (!isFranceTravailConfigured()) {
			throw new Error(
				"L'API France Travail n'est pas configurée (FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET manquants). Voir le README."
			);
		}

		const rawOffers = await searchOffers({ keywords: settings.keywords, location: settings.location });

		let newCount = 0;
		for (const offer of rawOffers) {
			if (offerExists(profileSlug, 'france_travail', offer.externalId)) continue;
			if (newCount >= MAX_NEW_OFFERS_PER_SCAN) break;
			newCount++;

			try {
				const fit = await assessFit(offer.rawText, profile, language);
				insertDiscoveredOffer({
					profile_slug: profileSlug,
					source: 'france_travail',
					external_id: offer.externalId,
					url: offer.url,
					title: offer.title,
					company: offer.company,
					location: offer.location,
					contract_type: offer.contractType,
					posted_date: offer.postedDate,
					raw_text: offer.rawText,
					fit_score: fit.score,
					fit_decision: fit.decision,
					fit_json: JSON.stringify({ categories: fit.categories, reasons: fit.reasons }),
				});
			} catch {
				// One offer failing to assess (a transient Claude error) shouldn't
				// abort the whole scan — it's simply retried on the next run since
				// it was never inserted, so offerExists() won't skip it.
			}
		}

		recordScanResult(profileSlug, { found: rawOffers.length, new: newCount });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		recordScanResult(profileSlug, { error: message });
	}
}
