import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { extractApplicationInfo } from '@/lib/claude';
import { extractDocxText } from '@/lib/generator-client';
import { parseLocale } from '@/lib/i18n';

const TMP_IMPORT_DIR = path.join(process.cwd(), '..', 'data', 'tmp', 'import');
const MAX_SIZE = 8 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx']);

function sanitizeFilename(name: string): string {
	return name.replace(/[/\\]/g, '_').replace(/^\.+/, '');
}

async function stageFile(file: File, destDir: string): Promise<{ fileName: string; text?: string; filePath?: string }> {
	const ext = path.extname(file.name).toLowerCase();
	if (!ALLOWED_EXTENSIONS.has(ext)) {
		throw new Error('Formats acceptés : .pdf, .docx');
	}
	if (file.size > MAX_SIZE) {
		throw new Error('Fichier trop volumineux (8 Mo maximum).');
	}
	const fileName = sanitizeFilename(file.name);
	const buffer = Buffer.from(await file.arrayBuffer());
	const filePath = path.join(destDir, fileName);
	fs.writeFileSync(filePath, buffer);

	if (ext === '.docx') {
		// python-docx reads the content directly — Claude never needs
		// filesystem access just to read a .docx.
		const text = await extractDocxText(buffer, fileName);
		return { fileName, text };
	}
	// PDFs are read natively by Claude Code's Read tool, from where we staged it.
	return { fileName, filePath };
}

export async function POST(req: NextRequest) {
	const form = await req.formData();
	const cv = form.get('cv');
	const coverLetter = form.get('cover_letter');
	const contextText = form.get('context')?.toString() ?? '';
	const language = parseLocale(form.get('language')?.toString());

	if (!(cv instanceof File)) {
		return NextResponse.json({ error: 'Le CV est obligatoire.' }, { status: 400 });
	}

	const tempId = crypto.randomUUID();
	const destDir = path.join(TMP_IMPORT_DIR, tempId);
	fs.mkdirSync(destDir, { recursive: true });

	try {
		const cvStaged = await stageFile(cv, destDir);
		const coverLetterStaged = coverLetter instanceof File ? await stageFile(coverLetter, destDir) : null;

		const info = await extractApplicationInfo(
			{
				contextText,
				cvText: cvStaged.text,
				cvFilePath: cvStaged.filePath,
				coverLetterText: coverLetterStaged?.text,
				coverLetterFilePath: coverLetterStaged?.filePath,
			},
			language
		);

		return NextResponse.json({
			tempId,
			cvFileName: cvStaged.fileName,
			coverLetterFileName: coverLetterStaged?.fileName ?? null,
			...info,
		});
	} catch (err) {
		fs.rm(destDir, { recursive: true, force: true }, () => {});
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
