import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob } from '@/lib/db';
import { getServerProfileSlug } from '@/lib/server-profile';
import { runGeneration } from '@/lib/jobs';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const jobId = Number(id);
	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });

	const job = getJob(jobId, profileSlug);
	if (!job) return NextResponse.json({ error: 'Tâche introuvable.' }, { status: 404 });
	if (job.status !== 'ready') {
		return NextResponse.json({ error: 'La génération a déjà été lancée pour cette tâche.' }, { status: 409 });
	}

	updateJob(jobId, { status: 'generating' }, profileSlug);
	void runGeneration(jobId, profileSlug);

	return NextResponse.json({ ok: true });
}
