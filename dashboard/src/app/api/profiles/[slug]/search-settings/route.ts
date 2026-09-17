import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { getProfileSearchSettings, setProfileSearchSettings } from '@/lib/db';
import { isFranceTravailConfigured } from '@/lib/france-travail';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	return NextResponse.json({
		settings: getProfileSearchSettings(slug),
		franceTravailConfigured: isFranceTravailConfigured(),
	});
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const { keywords, location, minFitScore, sources } = await req.json();
	if (!Array.isArray(keywords) || !keywords.every((k) => typeof k === 'string')) {
		return NextResponse.json({ error: 'Mots-clés invalides.' }, { status: 400 });
	}
	if (typeof minFitScore !== 'number' || !Number.isFinite(minFitScore) || minFitScore < 0 || minFitScore > 100) {
		return NextResponse.json({ error: 'Seuil invalide.' }, { status: 400 });
	}
	if (!Array.isArray(sources) || !sources.every((s) => typeof s === 'string')) {
		return NextResponse.json({ error: 'Sources invalides.' }, { status: 400 });
	}

	setProfileSearchSettings(slug, {
		keywords: keywords.map((k: string) => k.trim()).filter(Boolean),
		location: typeof location === 'string' && location.trim() ? location.trim() : null,
		minFitScore: Math.round(minFitScore),
		sources,
	});
	return NextResponse.json({ ok: true });
}
