import fs from 'node:fs';
import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { buildGenericCvContent, genericCvPath } from '@/lib/generic-cv';
import { candidateNameSlug } from '@/lib/jobs';
import { generateCv } from '@/lib/generator-client';
import { parseLocale } from '@/lib/i18n';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const profile = getProfile(slug);
	if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const language = parseLocale(req.nextUrl.searchParams.get('language'));
	const filePath = genericCvPath(slug, profile, language);
	return NextResponse.json({ exists: fs.existsSync(filePath), path: filePath });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const profile = getProfile(slug);
	if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const { language: rawLanguage } = await req.json();
	const language = parseLocale(rawLanguage);

	try {
		const content = buildGenericCvContent(profile);
		const candidateSlug = candidateNameSlug(profile);
		const result = await generateCv(profile, content, `CV_${candidateSlug}_${language}.docx`, slug, language);
		return NextResponse.json({ path: result.path });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: `Échec de la génération : ${message}` }, { status: 502 });
	}
}
