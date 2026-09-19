import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/profiles';
import { runScan } from '@/lib/scan';
import { getServerLocale } from '@/lib/server-locale';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	if (!getProfile(slug)) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const locale = await getServerLocale();
	void runScan(slug, locale);

	return NextResponse.json({ ok: true });
}
