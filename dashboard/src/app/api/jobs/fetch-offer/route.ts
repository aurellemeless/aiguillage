import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromHtml } from '@/lib/html-text';

export async function POST(req: NextRequest) {
	const { url } = await req.json();
	if (!url || typeof url !== 'string') {
		return NextResponse.json({ error: 'Lien manquant.' }, { status: 400 });
	}

	let parsed: URL;
	try {
		parsed = new URL(url);
	} catch {
		return NextResponse.json({ error: 'Lien invalide.' }, { status: 400 });
	}
	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		return NextResponse.json({ error: 'Seuls les liens http(s) sont supportés.' }, { status: 400 });
	}

	try {
		const res = await fetch(parsed.toString(), {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Aiguillage/1.0)' },
			redirect: 'follow',
		});
		if (!res.ok) {
			return NextResponse.json({ error: `Impossible de récupérer la page (HTTP ${res.status}).` }, { status: 502 });
		}
		const html = await res.text();
		const text = extractTextFromHtml(html);
		if (!text.trim()) {
			return NextResponse.json({ error: "Aucun texte trouvé sur cette page." }, { status: 422 });
		}
		return NextResponse.json({ text });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return NextResponse.json({ error: `Échec de récupération de l'offre : ${message}` }, { status: 502 });
	}
}
