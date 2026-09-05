import fs from 'node:fs';
import path from 'node:path';
import { getJob, insertApplication, updateJob } from './db';
import { analyzeOffer } from './claude';
import { generateCoverLetter as generateCoverLetterDocx, generateCv as generateCvDocx } from './generator-client';
import { applicationSlug, slugify } from './followup';
import { Locale, parseLocale } from './i18n';
import { ProposedContent } from './types';

const PROFILE_PATH = path.join(process.cwd(), '..', 'profile', 'profile.json');

function readProfile(): object {
	return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
}

function candidateNameSlug(): string {
	const profile = readProfile() as { identity?: { name?: string } };
	return slugify(profile.identity?.name ?? 'candidat');
}

export async function runAnalysis(jobId: number): Promise<void> {
	const job = getJob(jobId);
	if (!job) return;

	try {
		const content = await analyzeOffer(job.offer_text, readProfile(), parseLocale(job.language));
		updateJob(jobId, { status: 'ready', result_json: JSON.stringify(content) });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		updateJob(jobId, { status: 'error', error_message: message });
	}
}

export async function runGeneration(jobId: number): Promise<void> {
	const job = getJob(jobId);
	if (!job || !job.result_json) return;

	const content = JSON.parse(job.result_json) as ProposedContent;
	const language = parseLocale(job.language);
	const shouldGenerateCoverLetter = !!job.generate_cover_letter;

	try {
		const subdir = applicationSlug(content.company, content.role);
		const candidateSlug = candidateNameSlug();
		const letterPrefix = language === 'en' ? 'Cover_Letter' : 'Lettre';

		const cvResult = await generateCvDocx(content.cv, `CV_${candidateSlug}_${language}_${subdir}.docx`, subdir, language);
		const letterResult = shouldGenerateCoverLetter
			? await generateCoverLetterDocx(content.cover_letter, `${letterPrefix}_${candidateSlug}_${language}_${subdir}.docx`, subdir, language)
			: null;

		const applicationId = insertApplication({
			company: content.company,
			role: content.role,
			status: 'Envoyé',
			cv_file_path: cvResult.path,
			cover_letter_file_path: letterResult?.path ?? null,
		});

		let secondaryCvPath: string | null = null;
		let secondaryCoverLetterPath: string | null = null;

		if (job.also_other_language) {
			const otherLanguage: Locale = language === 'en' ? 'fr' : 'en';
			const otherLetterPrefix = otherLanguage === 'en' ? 'Cover_Letter' : 'Lettre';
			const otherContent = await analyzeOffer(job.offer_text, readProfile(), otherLanguage);

			const secondaryCv = await generateCvDocx(
				otherContent.cv,
				`CV_${candidateSlug}_${otherLanguage}_${subdir}.docx`,
				subdir,
				otherLanguage
			);
			secondaryCvPath = secondaryCv.path;

			if (shouldGenerateCoverLetter) {
				const secondaryLetter = await generateCoverLetterDocx(
					otherContent.cover_letter,
					`${otherLetterPrefix}_${candidateSlug}_${otherLanguage}_${subdir}.docx`,
					subdir,
					otherLanguage
				);
				secondaryCoverLetterPath = secondaryLetter.path;
			}
		}

		updateJob(jobId, {
			status: 'done',
			application_id: applicationId,
			cv_path: cvResult.path,
			cover_letter_path: letterResult?.path ?? null,
			result_json: JSON.stringify({ ...content, generation: { secondaryCvPath, secondaryCoverLetterPath } }),
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		updateJob(jobId, { status: 'error', error_message: message });
	}
}
