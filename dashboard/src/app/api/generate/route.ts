import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { insertApplication } from '@/lib/db';
import { generateCoverLetter, generateCv } from '@/lib/generator-client';
import { applicationSlug, slugify } from '@/lib/followup';
import { parseLocale } from '@/lib/i18n';
import { CoverLetterContent, CvContent } from '@/lib/types';

const PROFILE_PATH = path.join(process.cwd(), '..', 'profile', 'profile.json');

function candidateNameSlug(): string {
	const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
	return slugify(profile.identity?.name ?? 'candidat');
}

interface GenerateRequestBody {
	company: string;
	role: string;
	offerSource?: string;
	cv: CvContent;
	coverLetter?: CoverLetterContent;
	language?: string;
	subdir?: string;
	skipRecord?: boolean;
}

export async function POST(req: NextRequest) {
	const body = (await req.json()) as GenerateRequestBody;

	if (!body.company || !body.role) {
		return NextResponse.json({ error: 'Entreprise et poste sont requis.' }, { status: 400 });
	}

	const subdir = body.subdir || applicationSlug(body.company, body.role);
	const candidateSlug = candidateNameSlug();
	const language = parseLocale(body.language);
	const letterPrefix = language === 'en' ? 'Cover_Letter' : 'Lettre';

	try {
		const cvResult = await generateCv(body.cv, `CV_${candidateSlug}_${language}_${subdir}.docx`, subdir, language);

		const letterResult = body.coverLetter
			? await generateCoverLetter(body.coverLetter, `${letterPrefix}_${candidateSlug}_${language}_${subdir}.docx`, subdir, language)
			: null;

		if (body.skipRecord) {
			return NextResponse.json({
				subdir,
				cvPath: cvResult.path,
				coverLetterPath: letterResult?.path ?? null,
			});
		}

		const applicationId = insertApplication({
			company: body.company,
			role: body.role,
			offer_source: body.offerSource ?? null,
			status: 'Envoyé',
			cv_file_path: cvResult.path,
			cover_letter_file_path: letterResult?.path ?? null,
		});

		return NextResponse.json({
			applicationId,
			subdir,
			cvPath: cvResult.path,
			coverLetterPath: letterResult?.path ?? null,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
