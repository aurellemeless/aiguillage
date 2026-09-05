import { NextRequest, NextResponse } from 'next/server';
import { createJob, listJobs } from '@/lib/db';
import { parseLocale } from '@/lib/i18n';
import { getServerProfileSlug } from '@/lib/server-profile';
import { runAnalysis } from '@/lib/jobs';

export async function GET() {
	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ jobs: [] });
	return NextResponse.json({ jobs: listJobs(profileSlug) });
}

export async function POST(req: NextRequest) {
	const { offerText, language, alsoOtherLanguage, generateCoverLetter } = await req.json();

	if (!offerText || typeof offerText !== 'string' || !offerText.trim()) {
		return NextResponse.json({ error: "L'offre est vide." }, { status: 400 });
	}

	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const jobId = createJob({
		language: parseLocale(language),
		offer_text: offerText,
		also_other_language: !!alsoOtherLanguage,
		generate_cover_letter: generateCoverLetter !== false,
		profile_slug: profileSlug,
	});

	void runAnalysis(jobId, profileSlug);

	return NextResponse.json({ jobId });
}
