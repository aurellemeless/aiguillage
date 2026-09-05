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

function profileExtractionSchema(language: Locale): string {
	return language === 'en'
		? `{
  "identity": {"name": "...", "title": "...", "years_experience": 0, "location": "...", "email": "...", "phone": "...", "github": "...", "linkedin": "..."},
  "skills": {"category": ["...", "..."]},
  "skills_depth_notes": [],
  "experience": [{"company": "...", "role": "...", "dates": "...", "bullets": ["..."], "tech": ["..."]}],
  "education": [{"degree": "...", "institution": "...", "year": "..."}],
  "certifications": [{"name": "...", "organization": "...", "year": "..."}],
  "personal_projects": [],
  "languages": [{"language": "...", "level": "..."}],
  "driving_license": null
}`
		: `{
  "identity": {"name": "...", "title": "...", "years_experience": 0, "location": "...", "email": "...", "phone": "...", "github": "...", "linkedin": "..."},
  "skills": {"catégorie": ["...", "..."]},
  "skills_depth_notes": [],
  "experience": [{"company": "...", "role": "...", "dates": "...", "bullets": ["..."], "tech": ["..."]}],
  "education": [{"degree": "...", "institution": "...", "year": "..."}],
  "certifications": [{"name": "...", "organization": "...", "year": "..."}],
  "personal_projects": [],
  "languages": [{"language": "...", "level": "..."}],
  "driving_license": null
}`;
}

function buildProfileExtractionPromptFromFile(filePath: string, language: Locale): string {
	const schema = profileExtractionSchema(language);
	if (language === 'en') {
		return `You are an assistant who extracts structured profile data from a candidate's CV, to build a reusable JSON profile.

Use the Read tool to read the CV file at this path: ${filePath}

Strict instructions:
- Never invent information absent from the CV: leave a field empty ("" or []) if it's not present.
- "skills_depth_notes" and "personal_projects" MUST stay empty arrays ([]): these are nuances only the candidate can fill in themselves, do not infer them from the CV.
- Group skills under whatever categories make sense for this CV (e.g. languages, frontend, backend, databases...) as a key → list-of-strings map.
- "experience" must list ALL professional experience found in the CV, most recent first, without omitting any.
- Keep all textual content in its original language — do not translate anything.
- Reply ONLY with a valid JSON object, no text before or after, no markdown fences, matching exactly this schema:
${schema}`;
	}

	return `Tu es un assistant qui extrait les données structurées du CV d'un candidat, pour construire un profil JSON réutilisable.

Utilise l'outil Read pour lire le fichier CV situé à ce chemin : ${filePath}

Instructions strictes :
- N'invente jamais d'information absente du CV : laisse un champ vide ("" ou []) si l'info n'est pas présente.
- "skills_depth_notes" et "personal_projects" DOIVENT rester des tableaux vides ([]) : ce sont des nuances que seul le candidat peut renseigner lui-même, ne les déduis pas du CV.
- Regroupe les compétences sous les catégories qui te semblent pertinentes pour ce CV (ex : langages, frontend, backend, bases de données...) sous forme de clé → liste de valeurs.
- "experience" doit lister TOUTES les expériences professionnelles trouvées dans le CV, la plus récente en premier, sans en omettre.
- Conserve tout le contenu textuel dans sa langue d'origine — ne traduis rien.
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown, respectant exactement ce schéma :
${schema}`;
}

function buildProfileExtractionPromptFromText(cvText: string, language: Locale): string {
	const schema = profileExtractionSchema(language);
	if (language === 'en') {
		return `You are an assistant who extracts structured profile data from a candidate's CV, to build a reusable JSON profile.

Here is the CV text:
"""
${cvText}
"""

Strict instructions:
- Never invent information absent from the CV: leave a field empty ("" or []) if it's not present.
- "skills_depth_notes" and "personal_projects" MUST stay empty arrays ([]): these are nuances only the candidate can fill in themselves, do not infer them from the CV.
- Group skills under whatever categories make sense for this CV (e.g. languages, frontend, backend, databases...) as a key → list-of-strings map.
- "experience" must list ALL professional experience found in the CV, most recent first, without omitting any.
- Keep all textual content in its original language — do not translate anything.
- Reply ONLY with a valid JSON object, no text before or after, no markdown fences, matching exactly this schema:
${schema}`;
	}

	return `Tu es un assistant qui extrait les données structurées du CV d'un candidat, pour construire un profil JSON réutilisable.

Voici le texte du CV :
"""
${cvText}
"""

Instructions strictes :
- N'invente jamais d'information absente du CV : laisse un champ vide ("" ou []) si l'info n'est pas présente.
- "skills_depth_notes" et "personal_projects" DOIVENT rester des tableaux vides ([]) : ce sont des nuances que seul le candidat peut renseigner lui-même, ne les déduis pas du CV.
- Regroupe les compétences sous les catégories qui te semblent pertinentes pour ce CV (ex : langages, frontend, backend, bases de données...) sous forme de clé → liste de valeurs.
- "experience" doit lister TOUTES les expériences professionnelles trouvées dans le CV, la plus récente en premier, sans en omettre.
- Conserve tout le contenu textuel dans sa langue d'origine — ne traduis rien.
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown, respectant exactement ce schéma :
${schema}`;
}

function stripMarkdownFences(text: string): string {
	const trimmed = text.trim();
	const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
	return fenceMatch ? fenceMatch[1] : trimmed;
}

async function runClaudeForJson(prompt: string, toolsFlag: string[]): Promise<unknown> {
	const execution = execFileAsync('claude', ['-p', prompt, '--output-format', 'json', ...toolsFlag], {
		cwd: PROJECT_ROOT,
		timeout: 120_000,
		maxBuffer: 10 * 1024 * 1024,
	});
	// claude reads a piped (non-TTY) stdin by default and waits a few seconds for
	// input before giving up; we never send any, so close it immediately.
	execution.child.stdin?.end();
	const { stdout } = await execution;

	const envelope = JSON.parse(stdout);
	if (envelope.is_error) {
		throw new Error(`Claude Code a renvoyé une erreur : ${envelope.result ?? 'raison inconnue'}`);
	}

	const rawResult = envelope.result as string;
	const jsonText = stripMarkdownFences(rawResult);

	try {
		return JSON.parse(jsonText);
	} catch {
		throw new Error(`Impossible de parser la réponse de Claude Code en JSON. Réponse brute : ${rawResult}`);
	}
}

export async function analyzeOffer(offerText: string, profile: object, language: Locale = 'fr'): Promise<ProposedContent> {
	const prompt = buildPrompt(offerText, profile, language);
	return runClaudeForJson(prompt, ['--disallowedTools', DISALLOWED_TOOLS]) as Promise<ProposedContent>;
}

export async function extractProfileFromFile(filePath: string, language: Locale = 'fr'): Promise<object> {
	const prompt = buildProfileExtractionPromptFromFile(filePath, language);
	return runClaudeForJson(prompt, ['--allowedTools', 'Read']) as Promise<object>;
}

export async function extractProfileFromText(cvText: string, language: Locale = 'fr'): Promise<object> {
	const prompt = buildProfileExtractionPromptFromText(cvText, language);
	return runClaudeForJson(prompt, ['--disallowedTools', DISALLOWED_TOOLS]) as Promise<object>;
}
