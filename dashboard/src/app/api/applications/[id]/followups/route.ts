import { NextRequest, NextResponse } from 'next/server';
import { createFollowup } from '@/lib/db';
import { getServerProfileSlug } from '@/lib/server-profile';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const applicationId = Number(id);
	const { note } = await req.json();

	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const followup = createFollowup(applicationId, profileSlug, typeof note === 'string' && note.trim() ? note.trim() : null);
	if (!followup) return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });

	return NextResponse.json({ followup });
}
