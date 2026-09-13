import { NextRequest, NextResponse } from 'next/server';
import { getApplication, listFollowups } from '@/lib/db';
import { getProfile } from '@/lib/profiles';
import { generateFollowupDraft } from '@/lib/claude';
import { parseLocale } from '@/lib/i18n';
import { getServerProfileSlug } from '@/lib/server-profile';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const applicationId = Number(id);

	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const application = getApplication(applicationId, profileSlug);
	if (!application) return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });

	const profile = getProfile(profileSlug);
	if (!profile) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 });

	const { language: rawLanguage } = await req.json();
	const language = parseLocale(rawLanguage);

	try {
		const text = await generateFollowupDraft(
			{
				company: application.company,
				role: application.role,
				offerText: application.offer_text,
				applicationDate: application.application_date,
				previousFollowupsCount: listFollowups(applicationId).length,
			},
			profile,
			language
		);
		return NextResponse.json({ text });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: `Échec de la génération : ${message}` }, { status: 502 });
	}
}
