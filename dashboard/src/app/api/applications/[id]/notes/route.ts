import { NextRequest, NextResponse } from 'next/server';
import { updateNotes } from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const applicationId = Number(id);
	const { notes } = await req.json();

	updateNotes(applicationId, typeof notes === 'string' ? notes : '');
	return NextResponse.json({ ok: true });
}
