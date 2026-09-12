import fs from 'node:fs';
import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { genericCvPath } from '@/lib/generic-cv';
import { parseLocale } from '@/lib/i18n';
import { revealInFileManager } from '@/lib/reveal';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const profile = getProfile(slug);
	if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const { language: rawLanguage } = await req.json();
	const language = parseLocale(rawLanguage);
	const filePath = genericCvPath(slug, profile, language);
	if (!fs.existsSync(filePath)) {
		return NextResponse.json({ error: 'Le CV n’a pas encore été généré.' }, { status: 404 });
	}

	try {
		await revealInFileManager(filePath);
		return NextResponse.json({ ok: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: `Impossible d'ouvrir l'emplacement du fichier : ${message}` }, { status: 500 });
	}
}
