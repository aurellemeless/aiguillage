import fs from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeOffer } from '@/lib/claude';

const PROFILE_PATH = path.join(process.cwd(), '..', 'profile', 'profile.json');

export async function POST(req: NextRequest) {
	const { offerText } = await req.json();

	if (!offerText || typeof offerText !== 'string' || !offerText.trim()) {
		return NextResponse.json({ error: "L'offre est vide." }, { status: 400 });
	}

	const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));

	try {
		const content = await analyzeOffer(offerText, profile);
		return NextResponse.json(content);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: message }, { status: 502 });
	}
}
