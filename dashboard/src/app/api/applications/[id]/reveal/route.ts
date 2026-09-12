import fs from 'node:fs';
import { NextRequest, NextResponse } from 'next/server';
import { getApplication } from '@/lib/db';
import { getServerProfileSlug } from '@/lib/server-profile';
import { revealInFileManager } from '@/lib/reveal';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const { doc } = await req.json();
	if (doc !== 'cv' && doc !== 'letter') {
		return NextResponse.json({ error: 'Paramètre "doc" invalide.' }, { status: 400 });
	}

	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const application = getApplication(Number(id), profileSlug);
	if (!application) return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });

	const filePath = doc === 'cv' ? application.cv_file_path : application.cover_letter_file_path;
	if (!filePath) return NextResponse.json({ error: 'Aucun document.' }, { status: 404 });
	if (!fs.existsSync(filePath)) {
		return NextResponse.json({ error: 'Le fichier a été déplacé ou supprimé du disque.' }, { status: 404 });
	}

	try {
		await revealInFileManager(filePath);
		return NextResponse.json({ ok: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: `Impossible d'ouvrir l'emplacement du fichier : ${message}` }, { status: 500 });
	}
}
