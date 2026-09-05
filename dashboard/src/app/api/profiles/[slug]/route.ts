import { NextRequest, NextResponse } from 'next/server';
import { getProfile, saveProfile } from '@/lib/profiles';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const profile = getProfile(slug);
	if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });
	return NextResponse.json({ profile });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const body = await req.json();

	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return NextResponse.json({ error: 'Le profil doit être un objet JSON.' }, { status: 400 });
	}

	saveProfile(slug, body);
	return NextResponse.json({ ok: true });
}
