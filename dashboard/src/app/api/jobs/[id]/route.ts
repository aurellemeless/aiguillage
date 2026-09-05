import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob, type JobPatch } from '@/lib/db';
import { getServerProfileSlug } from '@/lib/server-profile';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const job = getJob(Number(id), profileSlug);
	if (!job) return NextResponse.json({ error: 'Tâche introuvable.' }, { status: 404 });
	return NextResponse.json({ job });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const jobId = Number(id);
	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const job = getJob(jobId, profileSlug);
	if (!job) return NextResponse.json({ error: 'Tâche introuvable.' }, { status: 404 });

	const body = await req.json();
	const patch: JobPatch = {};
	if (body.content !== undefined) patch.result_json = JSON.stringify(body.content);
	if (body.alsoOtherLanguage !== undefined) patch.also_other_language = !!body.alsoOtherLanguage;
	if (body.generateCoverLetter !== undefined) patch.generate_cover_letter = !!body.generateCoverLetter;

	updateJob(jobId, patch, profileSlug);
	return NextResponse.json({ ok: true });
}
