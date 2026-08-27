import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { ProposedContent } from './types';
import { Locale } from './i18n';

const execFileAsync = promisify(execFile);

// Run from the project root (not the dashboard folder) so the headless call
// doesn't pick up any unrelated CLAUDE.md/auto-memory context.
const PROJECT_ROOT = path.join(process.cwd(), '..');

const DISALLOWED_TOOLS = 'Bash Read Write Edit WebSearch WebFetch Agent';

function buildPrompt(offerText: string, profile: object, language: Locale): string {
	if (language === 'en') {
		return `You are an assistant who tailors a CV and a cover letter to a job posting, based on a candidate's full profile.

Here is the candidate's full profile (JSON):
${JSON.stringify(profile)}

Here is the job posting pasted by the candidate:
"""
${offerText}
"""

Strict instructions:
- "experience" MUST contain ALL of the profile's professional experience, in the same chronological order, without omitting any — a CV must never have a gap in the professional history. For each entry, only adapt the wording/emphasis of the bullets and which bullets are kept for this posting (you may keep fewer bullets for an experience less related to the posting, but the experience itself — company, dates, title — must always appear).
- For "skills", select and order the skill lines most relevant to the posting (this is the part of the CV that can legitimately vary a lot depending on the posting).
- NEVER invent a skill or experience absent from the profile. If "skills_depth_notes" marks a skill as "theoretical", "basic_notions", "certified_only" or "gap", never present it as real project experience in an experience bullet.
- All textual content (headline, tagline, summary, bullets, letter) must be written in English, even if the profile is written in another language — translate and adapt it.
- "personal_projects" is the only optional section: only include a personal project from the profile if it's genuinely relevant to this posting.
- Reply ONLY with a valid JSON object, no text before or after, no markdown fences, matching exactly this schema:
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
  "cover_letter": { "recipient": "...", "subject": "...", "body": ["paragraph 1", "paragraph 2"] }
}`;
	}

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
- Tout le contenu textuel (headline, tagline, summary, bullets, lettre) doit être rédigé en français, même si le profil fourni contient du texte dans une autre langue : traduis-le et adapte-le.
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

export async function analyzeOffer(offerText: string, profile: object, language: Locale = 'fr'): Promise<ProposedContent> {
	const prompt = buildPrompt(offerText, profile, language);

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
