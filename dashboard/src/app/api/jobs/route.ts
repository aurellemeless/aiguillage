import { NextRequest, NextResponse } from 'next/server';
import { createJob, listJobs } from '@/lib/db';
import { parseLocale } from '@/lib/i18n';
import { runAnalysis } from '@/lib/jobs';

export async function GET() {
	return NextResponse.json({ jobs: listJobs() });
}

export async function POST(req: NextRequest) {
	const { offerText, language, alsoOtherLanguage, generateCoverLetter } = await req.json();

	if (!offerText || typeof offerText !== 'string' || !offerText.trim()) {
		return NextResponse.json({ error: "L'offre est vide." }, { status: 400 });
	}

	const jobId = createJob({
		language: parseLocale(language),
		offer_text: offerText,
		also_other_language: !!alsoOtherLanguage,
		generate_cover_letter: generateCoverLetter !== false,
	});

	void runAnalysis(jobId);

	return NextResponse.json({ jobId });
}
