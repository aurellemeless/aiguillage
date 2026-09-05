import { NextRequest, NextResponse } from 'next/server';
import { updateStatus } from '@/lib/db';
import { getServerProfileSlug } from '@/lib/server-profile';
import { STATUSES } from '@/lib/types';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const applicationId = Number(id);
	const { status } = await req.json();

	if (!STATUSES.includes(status)) {
		return NextResponse.json({ error: `Statut inconnu : ${status}` }, { status: 400 });
	}

	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	updateStatus(applicationId, status, profileSlug);
	return NextResponse.json({ ok: true });
}
