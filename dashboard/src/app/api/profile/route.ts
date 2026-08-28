import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

const PROFILE_PATH = path.join(process.cwd(), '..', 'profile', 'profile.json');
const DEFAULT_PROFILE_PATH = path.join(process.cwd(), '..', 'profile', 'profile-default.json');

export async function GET() {
	const exists = fs.existsSync(PROFILE_PATH);
	const source = exists ? PROFILE_PATH : DEFAULT_PROFILE_PATH;
	const profile = JSON.parse(fs.readFileSync(source, 'utf-8'));
	return NextResponse.json({ profile, exists });
}

export async function PUT(req: NextRequest) {
	const body = await req.json();

	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return NextResponse.json({ error: 'Le profil doit être un objet JSON.' }, { status: 400 });
	}

	fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true });
	fs.writeFileSync(PROFILE_PATH, JSON.stringify(body, null, 2) + '\n', 'utf-8');
	return NextResponse.json({ ok: true });
}
