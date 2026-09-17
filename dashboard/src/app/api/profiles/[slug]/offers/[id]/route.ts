import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { getDiscoveredOffer, updateDiscoveredOfferStatus } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
	const { slug, id } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const offerId = Number(id);
	const offer = getDiscoveredOffer(offerId, slug);
	if (!offer) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });

	const { status } = await req.json();
	if (status !== 'new' && status !== 'dismissed') {
		return NextResponse.json({ error: 'Statut invalide.' }, { status: 400 });
	}

	updateDiscoveredOfferStatus(offerId, slug, status);
	return NextResponse.json({ ok: true });
}
