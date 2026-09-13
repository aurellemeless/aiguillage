import { NextRequest, NextResponse } from 'next/server';
import { updateFollowupDelay } from '@/lib/db';
import { getServerProfileSlug } from '@/lib/server-profile';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const applicationId = Number(id);
	const { days } = await req.json();

	if (typeof days !== 'number' || !Number.isFinite(days) || days < 1) {
		return NextResponse.json({ error: 'Délai invalide.' }, { status: 400 });
	}

	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const ok = updateFollowupDelay(applicationId, profileSlug, Math.round(days));
	if (!ok) return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });

	return NextResponse.json({ ok: true });
}
