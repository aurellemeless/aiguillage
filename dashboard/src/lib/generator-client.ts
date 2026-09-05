import { CoverLetterContent, CvContent } from './types';
import { Locale } from './i18n';
import { ProfileData } from './profile-types';

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
	profile: ProfileData,
	content: CvContent,
	outputName: string,
	subdir: string,
	language: Locale = 'fr'
): Promise<{ path: string }> {
	return postJson('/generate-cv', { ...content, profile, output_name: outputName, subdir, language });
}

export function generateCoverLetter(
	profile: ProfileData,
	content: CoverLetterContent,
	outputName: string,
	subdir: string,
	language: Locale = 'fr'
): Promise<{ path: string }> {
	return postJson('/generate-cover-letter', { ...content, profile, output_name: outputName, subdir, language });
}

export async function extractDocxText(buffer: Buffer, filename: string): Promise<string> {
	const formData = new FormData();
	formData.append('file', new Blob([new Uint8Array(buffer)]), filename);

	const res = await fetch(`${GENERATOR_BASE_URL}/extract-docx-text`, { method: 'POST', body: formData });
	if (!res.ok) {
		const detail = await res.text();
		throw new Error(`Le service de génération a échoué (${res.status}) : ${detail}`);
	}
	const data = (await res.json()) as { text: string };
	return data.text;
}
