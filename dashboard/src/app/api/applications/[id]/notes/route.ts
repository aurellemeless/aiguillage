import { NextRequest, NextResponse } from 'next/server';
import { updateNotes } from '@/lib/db';
import { getServerProfileSlug } from '@/lib/server-profile';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const applicationId = Number(id);
	const { notes } = await req.json();

	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	updateNotes(applicationId, typeof notes === 'string' ? notes : '', profileSlug);
	return NextResponse.json({ ok: true });
}
