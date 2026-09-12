import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { NextRequest, NextResponse } from 'next/server';
import { getApplication } from '@/lib/db';
import { getServerProfileSlug } from '@/lib/server-profile';

const execFileAsync = promisify(execFile);

// Opens the OS's native file manager on a given file. Always invoked via
// execFile with an argument array (never a shell string), so nothing in
// the resolved path — which never comes from the client, only from the
// application's own DB record — can be interpreted as a shell command.
async function revealInFileManager(filePath: string): Promise<void> {
	if (process.platform === 'darwin') {
		await execFileAsync('open', ['-R', filePath]);
		return;
	}
	if (process.platform === 'win32') {
		// explorer.exe routinely exits non-zero even on success; a spawn
		// failure (e.g. explorer missing) would reject with ENOENT instead.
		try {
			await execFileAsync('explorer', [`/select,${filePath}`]);
		} catch (err) {
			if (err instanceof Error && 'code' in err && err.code === 'ENOENT') throw err;
		}
		return;
	}
	// Linux: no desktop-environment-agnostic way to select a specific file,
	// so open its containing folder instead.
	await execFileAsync('xdg-open', [path.dirname(filePath)]);
}

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
