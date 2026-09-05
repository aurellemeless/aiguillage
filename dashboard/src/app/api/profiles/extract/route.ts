import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { extractProfileFromFile, extractProfileFromText } from '@/lib/claude';
import { extractDocxText } from '@/lib/generator-client';
import { parseLocale } from '@/lib/i18n';

const TMP_DIR = path.join(process.cwd(), '..', 'data', 'tmp');
const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx']);

export async function POST(req: NextRequest) {
	const form = await req.formData();
	const file = form.get('file');
	const language = parseLocale(form.get('language')?.toString());

	if (!(file instanceof File)) {
		return NextResponse.json({ error: 'Aucun fichier reçu.' }, { status: 400 });
	}

	const ext = path.extname(file.name).toLowerCase();
	if (!ALLOWED_EXTENSIONS.has(ext)) {
		return NextResponse.json({ error: 'Formats acceptés : .pdf, .docx' }, { status: 400 });
	}
	if (file.size > MAX_SIZE) {
		return NextResponse.json({ error: 'Fichier trop volumineux (8 Mo maximum).' }, { status: 400 });
	}

	try {
		const buffer = Buffer.from(await file.arrayBuffer());

		if (ext === '.docx') {
			// python-docx reads the file content directly — no need to give Claude
			// filesystem access for this format.
			const cvText = await extractDocxText(buffer, file.name);
			const profile = await extractProfileFromText(cvText, language);
			return NextResponse.json({ profile });
		}

		// PDFs are read natively by Claude Code's Read tool.
		fs.mkdirSync(TMP_DIR, { recursive: true });
		const tmpPath = path.join(TMP_DIR, `${crypto.randomUUID()}${ext}`);
		try {
			fs.writeFileSync(tmpPath, buffer);
			const profile = await extractProfileFromFile(tmpPath, language);
			return NextResponse.json({ profile });
		} finally {
			fs.rm(tmpPath, { force: true }, () => {});
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
