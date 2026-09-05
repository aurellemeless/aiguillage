import { NextRequest, NextResponse } from 'next/server';
import { getProfile, setDefaultProfileSlug } from '@/lib/profiles';

export async function PUT(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	setDefaultProfileSlug(slug);
	return NextResponse.json({ ok: true });
}
