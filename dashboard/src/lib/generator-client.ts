import { CoverLetterContent, CvContent } from './types';
import { Locale } from './i18n';

const GENERATOR_BASE_URL = process.env.CV_GENERATOR_URL ?? 'http://localhost:8000';

async function postJson<T>(path: string, body: unknown): Promise<T> {
	const res = await fetch(`${GENERATOR_BASE_URL}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!res.ok) {
		const detail = await res.text();
		throw new Error(`Le service de génération a échoué (${res.status}) : ${detail}`);
	}
	return res.json() as Promise<T>;
}

export function generateCv(
	content: CvContent,
	outputName: string,
	subdir: string,
	language: Locale = 'fr'
): Promise<{ path: string }> {
	return postJson('/generate-cv', { ...content, output_name: outputName, subdir, language });
}

export function generateCoverLetter(
	content: CoverLetterContent,
	outputName: string,
	subdir: string,
	language: Locale = 'fr'
): Promise<{ path: string }> {
	return postJson('/generate-cover-letter', { ...content, output_name: outputName, subdir, language });
}
