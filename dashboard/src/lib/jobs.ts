import { getJob, insertApplication, updateJob } from './db';
import { getProfile } from './profiles';
import { analyzeOffer } from './claude';
import { generateCoverLetter as generateCoverLetterDocx, generateCv as generateCvDocx } from './generator-client';
import { applicationSlug, slugify } from './followup';
import { Locale, parseLocale } from './i18n';
import { ProfileData } from './profile-types';
import { ProposedContent } from './types';

function candidateNameSlug(profile: ProfileData): string {
	return slugify(profile.identity?.name ?? 'candidat');
}

function requireProfile(profileSlug: string): ProfileData {
	const profile = getProfile(profileSlug);
	if (!profile) throw new Error(`Profil introuvable : ${profileSlug}`);
	return profile;
}

export async function runAnalysis(jobId: number, profileSlug: string): Promise<void> {
	const job = getJob(jobId, profileSlug);
	if (!job) return;

	try {
		const profile = requireProfile(profileSlug);
		const content = await analyzeOffer(job.offer_text, profile, parseLocale(job.language));
		updateJob(jobId, { status: 'ready', result_json: JSON.stringify(content) }, profileSlug);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		updateJob(jobId, { status: 'error', error_message: message }, profileSlug);
	}
}

export async function runGeneration(jobId: number, profileSlug: string): Promise<void> {
	const job = getJob(jobId, profileSlug);
	if (!job || !job.result_json) return;

	const content = JSON.parse(job.result_json) as ProposedContent;
	const language = parseLocale(job.language);
	const shouldGenerateCoverLetter = !!job.generate_cover_letter;

	try {
		const profile = requireProfile(profileSlug);
		const appSlug = applicationSlug(content.company, content.role);
		const subdir = `${profileSlug}/${appSlug}`;
		const candidateSlug = candidateNameSlug(profile);
		const letterPrefix = language === 'en' ? 'Cover_Letter' : 'Lettre';

		const cvResult = await generateCvDocx(profile, content.cv, `CV_${candidateSlug}_${language}_${appSlug}.docx`, subdir, language);
		const letterResult = shouldGenerateCoverLetter
			? await generateCoverLetterDocx(
					profile,
					content.cover_letter,
					`${letterPrefix}_${candidateSlug}_${language}_${appSlug}.docx`,
					subdir,
					language
				)
			: null;

		const applicationId = insertApplication({
			company: content.company,
			role: content.role,
			status: 'Envoyé',
			cv_file_path: cvResult.path,
			cover_letter_file_path: letterResult?.path ?? null,
			profile_slug: profileSlug,
		});

		let secondaryCvPath: string | null = null;
		let secondaryCoverLetterPath: string | null = null;

		if (job.also_other_language) {
			const otherLanguage: Locale = language === 'en' ? 'fr' : 'en';
			const otherLetterPrefix = otherLanguage === 'en' ? 'Cover_Letter' : 'Lettre';
			const otherContent = await analyzeOffer(job.offer_text, profile, otherLanguage);

			const secondaryCv = await generateCvDocx(
				profile,
				otherContent.cv,
				`CV_${candidateSlug}_${otherLanguage}_${appSlug}.docx`,
				subdir,
				otherLanguage
			);
			secondaryCvPath = secondaryCv.path;

			if (shouldGenerateCoverLetter) {
				const secondaryLetter = await generateCoverLetterDocx(
					profile,
					otherContent.cover_letter,
					`${otherLetterPrefix}_${candidateSlug}_${otherLanguage}_${appSlug}.docx`,
					subdir,
					otherLanguage
				);
				secondaryCoverLetterPath = secondaryLetter.path;
			}
		}

		updateJob(
			jobId,
			{
				status: 'done',
				application_id: applicationId,
				cv_path: cvResult.path,
				cover_letter_path: letterResult?.path ?? null,
				result_json: JSON.stringify({ ...content, generation: { secondaryCvPath, secondaryCoverLetterPath } }),
			},
			profileSlug
		);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		updateJob(jobId, { status: 'error', error_message: message }, profileSlug);
	}
}
