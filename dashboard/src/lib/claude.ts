import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { ProposedContent } from './types';

const execFileAsync = promisify(execFile);

// Run from the project root (not the dashboard folder) so the headless call
// doesn't pick up any unrelated CLAUDE.md/auto-memory context.
const PROJECT_ROOT = path.join(process.cwd(), '..');

const DISALLOWED_TOOLS = 'Bash Read Write Edit WebSearch WebFetch Agent';

function buildPrompt(offerText: string, profile: object): string {
	return `Tu es un assistant qui adapte un CV et une lettre de motivation à une offre d'emploi, à partir du profil complet d'un candidat.

Voici le profil complet du candidat (JSON) :
${JSON.stringify(profile)}

Voici l'offre d'emploi collée par le candidat :
"""
${offerText}
"""

Instructions strictes :
- "experience" DOIT contenir TOUTES les expériences professionnelles du profil, dans le même ordre chronologique, sans en omettre aucune — un CV ne doit jamais avoir de trou dans l'historique professionnel. Pour chaque expérience, adapte uniquement la reformulation/l'emphase des bullets et la sélection des bullets les plus pertinents pour l'offre (tu peux en garder moins pour une expérience peu liée à l'offre, mais l'expérience elle-même — entreprise, dates, intitulé — doit toujours apparaître).
- Pour "skills", sélectionne et ordonne les lignes de compétences les plus pertinentes pour l'offre (c'est la partie du CV qui peut légitimement varier fortement selon l'offre).
- N'invente JAMAIS une compétence ou une expérience absente du profil. Si "skills_depth_notes" indique un niveau "theoretical", "basic_notions", "certified_only" ou "gap" pour une compétence, ne la présente jamais comme une expérience projet réelle dans une puce d'expérience.
- Tout le contenu textuel (headline, tagline, summary, bullets, lettre) doit être rédigé en français.
- "personal_projects" est la seule section optionnelle : n'inclus un projet personnel du profil que s'il est réellement pertinent pour cette offre.
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown, respectant exactement ce schéma :
{
  "company": "...",
  "role": "...",
  "cv": {
    "headline": "...",
    "tagline": "...",
    "summary": "...",
    "skills": [{"label": "...", "values": ["..."]}],
    "experience": [{"company": "...", "dates": "...", "role": "...", "bullets": ["..."], "tech": ["..."]}],
    "personal_projects": [{"company": "...", "dates": "...", "role": "...", "bullets": ["..."], "tech": ["..."]}]
  },
  "cover_letter": { "recipient": "...", "subject": "...", "body": ["paragraphe 1", "paragraphe 2"] }
}`;
}

function stripMarkdownFences(text: string): string {
	const trimmed = text.trim();
	const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	return fenceMatch ? fenceMatch[1] : trimmed;
}

export async function analyzeOffer(offerText: string, profile: object): Promise<ProposedContent> {
	const prompt = buildPrompt(offerText, profile);

	const { stdout } = await execFileAsync(
		'claude',
		['-p', prompt, '--output-format', 'json', '--disallowedTools', DISALLOWED_TOOLS],
		{ cwd: PROJECT_ROOT, timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }
	);

	const envelope = JSON.parse(stdout);
	if (envelope.is_error) {
		throw new Error(`Claude Code a renvoyé une erreur : ${envelope.result ?? 'raison inconnue'}`);
	}

	const rawResult = envelope.result as string;
	const jsonText = stripMarkdownFences(rawResult);

	try {
		return JSON.parse(jsonText) as ProposedContent;
	} catch {
		throw new Error(
			`Impossible de parser la réponse de Claude Code en JSON. Réponse brute : ${rawResult}`
		);
	}
}
