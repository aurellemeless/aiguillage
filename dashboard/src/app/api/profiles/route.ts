import { NextRequest, NextResponse } from 'next/server';
import { createProfile, listProfiles } from '@/lib/profiles';

export async function GET() {
	return NextResponse.json({ profiles: listProfiles() });
}

export async function POST(req: NextRequest) {
	const { label } = await req.json();
	if (!label || typeof label !== 'string' || !label.trim()) {
		return NextResponse.json({ error: 'Le nom du profil est requis.' }, { status: 400 });
	}
	const slug = createProfile(label.trim());
	return NextResponse.json({ slug });
}
