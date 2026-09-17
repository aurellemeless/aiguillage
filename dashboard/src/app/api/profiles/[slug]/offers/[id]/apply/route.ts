import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { getDiscoveredOffer, createJob, updateDiscoveredOfferStatus } from '@/lib/db';
import { runAnalysis } from '@/lib/jobs';
import { getServerLocale } from '@/lib/server-locale';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string; id: string }> }) {
	const { slug, id } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const offerId = Number(id);
	const offer = getDiscoveredOffer(offerId, slug);
	if (!offer) return NextResponse.json({ error: 'Offre introuvable.' }, { status: 404 });

	const locale = await getServerLocale();
	const jobId = createJob({ language: locale, offer_text: offer.raw_text, profile_slug: slug });
	void runAnalysis(jobId, slug);

	updateDiscoveredOfferStatus(offerId, slug, 'applied');

	return NextResponse.json({ jobId });
}
