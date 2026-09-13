import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { getProfileSettings, setDefaultFollowupDelay } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	return NextResponse.json({ settings: getProfileSettings(slug) });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const { defaultFollowupDelayDays } = await req.json();
	if (typeof defaultFollowupDelayDays !== 'number' || !Number.isFinite(defaultFollowupDelayDays) || defaultFollowupDelayDays < 1) {
		return NextResponse.json({ error: 'Délai invalide.' }, { status: 400 });
	}

	setDefaultFollowupDelay(slug, Math.round(defaultFollowupDelayDays));
	return NextResponse.json({ ok: true });
}
