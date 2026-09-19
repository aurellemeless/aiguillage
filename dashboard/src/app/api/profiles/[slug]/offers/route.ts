import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { listDiscoveredOffers, OfferStatus } from '@/lib/db';

const VALID_STATUSES: OfferStatus[] = ['new', 'dismissed', 'applied'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const statusParam = req.nextUrl.searchParams.get('status') ?? 'new';
	const status = VALID_STATUSES.includes(statusParam as OfferStatus) ? (statusParam as OfferStatus) : 'new';

	return NextResponse.json({ offers: listDiscoveredOffers(slug, status) });
}
