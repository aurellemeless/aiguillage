import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { insertApplication } from '@/lib/db';
import { getProfile } from '@/lib/profiles';
import { applicationSlug } from '@/lib/followup';
import { assessFit } from '@/lib/claude';
import { getServerProfileSlug } from '@/lib/server-profile';
import { getServerLocale } from '@/lib/server-locale';

const TMP_IMPORT_DIR = path.join(process.cwd(), '..', 'data', 'tmp', 'import');
const GENERATED_DIR = path.join(process.cwd(), '..', 'data', 'generated');

function moveStagedFile(tempId: string, fileName: string, destDir: string): string {
	const src = path.join(TMP_IMPORT_DIR, tempId, fileName);
	const dest = path.join(destDir, fileName);
	fs.mkdirSync(destDir, { recursive: true });
	fs.renameSync(src, dest);
	return dest;
}

export async function POST(req: NextRequest) {
	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const profile = getProfile(profileSlug);
	if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const { tempId, cvFileName, coverLetterFileName, company, role, offer_text, offer_source, application_date, status } =
		await req.json();

	if (typeof tempId !== 'string' || typeof cvFileName !== 'string') {
		return NextResponse.json({ error: 'Import invalide.' }, { status: 400 });
	}
	if (typeof company !== 'string' || !company.trim() || typeof role !== 'string' || !role.trim()) {
		return NextResponse.json({ error: "L'entreprise et le poste sont obligatoires." }, { status: 400 });
	}

	const stagedDir = path.join(TMP_IMPORT_DIR, tempId);
	if (!fs.existsSync(stagedDir)) {
		return NextResponse.json({ error: 'Les fichiers importés ont expiré, recommence l’import.' }, { status: 410 });
	}

	const locale = await getServerLocale();
	const dateStr = typeof application_date === 'string' && application_date ? application_date : new Date().toISOString().slice(0, 10);
	const subdir = path.join(GENERATED_DIR, profileSlug, applicationSlug(company, role, dateStr));

	try {
		const cvPath = moveStagedFile(tempId, cvFileName, subdir);
		const coverLetterPath = typeof coverLetterFileName === 'string' ? moveStagedFile(tempId, coverLetterFileName, subdir) : null;
		fs.rm(stagedDir, { recursive: true, force: true }, () => {});

		const offerTextTrimmed = typeof offer_text === 'string' && offer_text.trim() ? offer_text.trim() : null;
		let fit: { score: number; decision: string; json: string } | null = null;
		// Only worth the extra call when there's real offer content to judge
		// the fit against — a one-line context isn't a posting.
		if (offerTextTrimmed && offerTextTrimmed.length > 200) {
			try {
				const result = await assessFit(offerTextTrimmed, profile, locale);
				fit = { score: result.score, decision: result.decision, json: JSON.stringify({ categories: result.categories, reasons: result.reasons }) };
			} catch {
				// Fit assessment is a bonus here, not the point of importing —
				// never block saving the application over it.
			}
		}

		const applicationId = insertApplication({
			company: company.trim(),
			role: role.trim(),
			offer_source: typeof offer_source === 'string' && offer_source.trim() ? offer_source.trim() : null,
			offer_text: offerTextTrimmed,
			status: typeof status === 'string' && status ? status : 'sent',
			cv_file_path: cvPath,
			cover_letter_file_path: coverLetterPath,
			profile_slug: profileSlug,
			application_date: dateStr,
			fit_score: fit?.score ?? null,
			fit_decision: fit?.decision ?? null,
			fit_json: fit?.json ?? null,
		});

		return NextResponse.json({ applicationId });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: `Échec de l'enregistrement : ${message}` }, { status: 500 });
	}
}
