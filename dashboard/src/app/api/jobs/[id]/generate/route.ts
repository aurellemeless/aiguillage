import { NextRequest, NextResponse } from 'next/server';
import { getJob, updateJob } from '@/lib/db';
import { runGeneration } from '@/lib/jobs';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const jobId = Number(id);
	const job = getJob(jobId);
	if (!job) return NextResponse.json({ error: 'Tâche introuvable.' }, { status: 404 });
	if (job.status !== 'ready') {
		return NextResponse.json({ error: 'La génération a déjà été lancée pour cette tâche.' }, { status: 409 });
	}

	updateJob(jobId, { status: 'generating' });
	void runGeneration(jobId);

	return NextResponse.json({ ok: true });
}
