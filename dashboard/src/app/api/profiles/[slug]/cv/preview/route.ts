import fs from 'node:fs';
import mammoth from 'mammoth';
import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { genericCvPath } from '@/lib/generic-cv';
import { parseLocale } from '@/lib/i18n';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const profile = getProfile(slug);
	if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const language = parseLocale(req.nextUrl.searchParams.get('language'));
	const filePath = genericCvPath(slug, profile, language);
	if (!fs.existsSync(filePath)) {
		return NextResponse.json({ error: 'Le CV n’a pas encore été généré.' }, { status: 404 });
	}

	try {
		const result = await mammoth.convertToHtml({ path: filePath });
		return NextResponse.json({ html: result.value });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: `Impossible de lire le document : ${message}` }, { status: 500 });
	}
}
