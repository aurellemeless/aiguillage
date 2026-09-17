import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { JobFit, ProposedContent } from './types';
import { Locale } from './i18n';

const execFileAsync = promisify(execFile);

// Run from the project root (not the dashboard folder) so the headless call
// doesn't pick up any unrelated CLAUDE.md/auto-memory context.
const PROJECT_ROOT = path.join(process.cwd(), '..');

const DISALLOWED_TOOLS = 'Bash Read Write Edit WebSearch WebFetch Agent';

// The fuller prompts (offer analysis + job-fit assessment together) can run
// close to two minutes; give real headroom rather than cutting it close.
const CLAUDE_TIMEOUT_MS = 240_000;

// Shared by the full analysis prompt and the fit-only prompt (offer
// discovery) so the categorization/scoring rules never drift between them.
function fitInstructions(language: Locale): string {
	if (language === 'en') {
		return `Organize it into exactly these 5 categories (omit a category only if the posting truly gives nothing to assess for it):
  - "must_have": the requirements without which the candidate would be rejected outright (core technologies explicitly required, minimum years of experience, a required language or certification, a hard eligibility requirement).
  - "nice_to_have": explicitly optional or bonus requirements ("a plus", "appreciated", secondary technologies).
  - "domain_experience": fit with the business/industry domain of the posting (e.g. fintech, media/streaming, SaaS, healthcare) and the kind of product/architecture involved (e.g. public APIs, high-traffic systems) — not raw tech skills, but relevant sector/domain exposure.
  - "constraints": practical/logistic constraints — location or remote policy, contract type (permanent/freelance/contract), language of work, availability, stated salary range if any — compare against the profile's own location/identity/languages where relevant.
  - "seniority": the seniority level asked for (junior/mid/senior/lead/staff, years of experience, management scope) versus the candidate's actual level.
  For each category, list its "criteria": a "label" (short, as it would appear in a table column) and a "result": "excellent" (strong, direct, recent match), "good" (real match but less central or less recent), "weak" (limited exposure only — theoretical, basic notions, certified-only, or a gap per "skills_depth_notes"), "missing" (required, absent from the profile), or "not_required" (this posting marks it optional, or it is genuinely irrelevant here — e.g. blockchain/Web3 for a posting that never mentions it).
  - "score": your overall match percentage (0-100). This must NOT be a naive keyword count or an additive point score (do not do "React=+10, Node=+10, AWS=+5..."). Weigh categories very unevenly: "must_have" and "constraints" dominate the judgment — any "missing" must-have, or a hard constraint mismatch (e.g. on-site only in a city incompatible with the profile, or an incompatible contract type), should cap the score low regardless of how many nice-to-haves match. "nice_to_have" only nudges the score, never drives it. "domain_experience" and "seniority" sit in between: meaningful but not usually disqualifying on their own.
  - "decision": "apply" for a strong match worth applying to, "maybe" for a partial match worth a careful read before deciding, "skip" for a poor match — driven primarily by "must_have" and "constraints", not by the score in isolation.
  - "reasons": 3 to 6 short bullet points justifying the decision, referencing concrete elements of the profile (company names, technologies, years) — never invent an achievement not in the profile.`;
	}
	return `Organise-la en exactement ces 5 catégories (n'omets une catégorie que si l'offre ne donne vraiment rien à évaluer pour elle) :
  - "must_have" : les exigences sans lesquelles le candidat serait écarté d'office (technologies cœur explicitement exigées, nombre d'années minimum, langue ou certification exigée, condition d'éligibilité rédhibitoire).
  - "nice_to_have" : les exigences explicitement optionnelles ou en bonus ("un plus", "apprécié", technologies secondaires).
  - "domain_experience" : l'adéquation avec le secteur/domaine métier de l'offre (ex : fintech, média/streaming, SaaS, santé) et le type de produit/architecture concerné (ex : API publiques, systèmes à fort trafic) — pas des compétences techniques brutes, mais une expérience sectorielle/métier pertinente.
  - "constraints" : les contraintes pratiques/logistiques — localisation ou politique de télétravail, type de contrat (CDI/freelance/mission), langue de travail, disponibilité, fourchette de salaire annoncée le cas échéant — à comparer avec la localisation/l'identité/les langues du profil quand c'est pertinent.
  - "seniority" : le niveau de séniorité demandé (junior/confirmé/senior/lead/staff, années d'expérience, périmètre de management) comparé au niveau réel du candidat.
  Pour chaque catégorie, liste ses "criteria" : un "label" (court, comme un intitulé de colonne de tableau) et un "result" : "excellent" (correspondance solide, directe, récente), "good" (correspondance réelle mais moins centrale ou moins récente), "weak" (exposition limitée seulement — théorique, notions de base, certifié uniquement, ou un "gap" selon "skills_depth_notes"), "missing" (exigé, absent du profil), ou "not_required" (cette offre le présente comme optionnel, ou c'est réellement hors sujet ici — ex : blockchain/Web3 pour une offre qui n'en parle jamais).
  - "score" : ton pourcentage de correspondance global (0-100). Ce ne doit SURTOUT PAS être un comptage naïf de mots-clés ni un score additif par points (pas de "React=+10, Node=+10, AWS=+5..."). Pondère les catégories de façon très inégale : "must_have" et "constraints" dominent le jugement — tout "missing" en must-have, ou une contrainte incompatible (ex : présentiel obligatoire dans une ville incompatible avec le profil, ou un type de contrat incompatible), doit plafonner le score à un niveau bas, quel que soit le nombre de nice-to-have satisfaits. "nice_to_have" ne fait qu'ajuster légèrement le score, jamais le déterminer. "domain_experience" et "seniority" se situent entre les deux : significatifs mais rarement rédhibitoires seuls.
  - "decision" : "apply" pour une bonne correspondance qui mérite de candidater, "maybe" pour une correspondance partielle qui mérite une lecture attentive avant de décider, "skip" pour une mauvaise correspondance — déterminée avant tout par "must_have" et "constraints", pas par le score isolément.
  - "reasons" : 3 à 6 puces courtes justifiant la décision, en citant des éléments concrets du profil (noms d'entreprises, technologies, années) — n'invente jamais une réalisation absente du profil.`;
}

const FIT_SCHEMA = `{
  "score": 0,
  "decision": "apply",
  "categories": [
    { "category": "must_have", "criteria": [{"label": "...", "result": "excellent"}] },
    { "category": "nice_to_have", "criteria": [{"label": "...", "result": "not_required"}] },
    { "category": "domain_experience", "criteria": [{"label": "...", "result": "good"}] },
    { "category": "constraints", "criteria": [{"label": "...", "result": "excellent"}] },
    { "category": "seniority", "criteria": [{"label": "...", "result": "excellent"}] }
  ],
  "reasons": ["..."]
}`;

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
- Also assess how well the candidate fits this specific posting ("fit"). ${fitInstructions(language)}
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
  "cover_letter": { "recipient": "...", "subject": "...", "body": ["paragraph 1", "paragraph 2"] },
  "fit": ${FIT_SCHEMA}
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
- Évalue aussi l'adéquation du candidat à cette offre précise ("fit"). ${fitInstructions(language)}
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
  "cover_letter": { "recipient": "...", "subject": "...", "body": ["paragraphe 1", "paragraphe 2"] },
  "fit": ${FIT_SCHEMA}
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

async function runClaudeForText(prompt: string, toolsFlag: string[]): Promise<string> {
	const execution = execFileAsync('claude', ['-p', prompt, '--output-format', 'json', ...toolsFlag], {
		cwd: PROJECT_ROOT,
		timeout: CLAUDE_TIMEOUT_MS,
		maxBuffer: 10 * 1024 * 1024,
	});
	execution.child.stdin?.end();
	const { stdout } = await execution;

	const envelope = JSON.parse(stdout);
	if (envelope.is_error) {
		throw new Error(`Claude Code a renvoyé une erreur : ${envelope.result ?? 'raison inconnue'}`);
	}
	return (envelope.result as string).trim();
}

async function runClaudeForJson(prompt: string, toolsFlag: string[]): Promise<unknown> {
	const execution = execFileAsync('claude', ['-p', prompt, '--output-format', 'json', ...toolsFlag], {
		cwd: PROJECT_ROOT,
		timeout: CLAUDE_TIMEOUT_MS,
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

// Fit-only assessment for offer discovery: no CV/cover letter, so it's much
// cheaper than analyzeOffer — meant to run once per newly-found offer during
// a scan, before the candidate ever decides to actually apply.
function buildFitOnlyPrompt(offerText: string, profile: object, language: Locale): string {
	if (language === 'en') {
		return `You are an assistant who assesses how well a candidate fits a job posting, based on the candidate's full profile. You are NOT writing a CV or cover letter here — only the fit assessment.

Here is the candidate's full profile (JSON):
${JSON.stringify(profile)}

Here is the job posting:
"""
${offerText}
"""

Assess the fit ("fit"). ${fitInstructions(language)}

Reply ONLY with a valid JSON object, no text before or after, no markdown fences, matching exactly this schema:
${FIT_SCHEMA}`;
	}
	return `Tu es un assistant qui évalue l'adéquation d'un candidat à une offre d'emploi, à partir du profil complet du candidat. Tu ne rédiges PAS de CV ni de lettre de motivation ici — seulement l'évaluation de fit.

Voici le profil complet du candidat (JSON) :
${JSON.stringify(profile)}

Voici l'offre d'emploi :
"""
${offerText}
"""

Évalue le fit ("fit"). ${fitInstructions(language)}

Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après, sans balises markdown, respectant exactement ce schéma :
${FIT_SCHEMA}`;
}

export async function assessFit(offerText: string, profile: object, language: Locale = 'fr'): Promise<JobFit> {
	const prompt = buildFitOnlyPrompt(offerText, profile, language);
	return runClaudeForJson(prompt, ['--disallowedTools', DISALLOWED_TOOLS]) as Promise<JobFit>;
}

interface FollowupContext {
	company: string;
	role: string;
	offerText: string | null;
	applicationDate: string | null;
	previousFollowupsCount: number;
}

function buildFollowupPrompt(context: FollowupContext, profile: object, language: Locale): string {
	const offerBlock = context.offerText
		? language === 'en'
			? `Here is the original job posting:\n"""\n${context.offerText}\n"""`
			: `Voici l'offre d'emploi d'origine :\n"""\n${context.offerText}\n"""`
		: language === 'en'
			? 'The original job posting text is not available.'
			: "Le texte de l'offre d'origine n'est pas disponible.";

	if (language === 'en') {
		return `You are an assistant who drafts a short, polite follow-up message for a job application sent but still unanswered, based on the candidate's profile.

Here is the candidate's full profile (JSON):
${JSON.stringify(profile)}

Company: ${context.company}
Role: ${context.role}
Application sent on: ${context.applicationDate ?? 'unknown'}
Follow-ups already sent for this application: ${context.previousFollowupsCount}

${offerBlock}

Strict instructions:
- Write a short message (3-5 sentences), polite and professional, suitable as the body of a follow-up email.
- Briefly restate the role and the application date, and reaffirm interest without being pushy.
- If follow-ups were already sent, acknowledge this is a further follow-up without being redundant with a previous one.
- Never invent information not given above.
- Reply ONLY with the message body itself — no subject line, no markdown, no introductory phrase like "Here is the message", no surrounding quotes.`;
	}

	return `Tu es un assistant qui rédige un message de relance court et poli pour une candidature envoyée mais restée sans réponse, à partir du profil du candidat.

Voici le profil complet du candidat (JSON) :
${JSON.stringify(profile)}

Entreprise : ${context.company}
Poste : ${context.role}
Candidature envoyée le : ${context.applicationDate ?? 'inconnue'}
Relances déjà envoyées pour cette candidature : ${context.previousFollowupsCount}

${offerBlock}

Instructions strictes :
- Rédige un message court (3 à 5 phrases), poli et professionnel, adapté au corps d'un email de relance.
- Rappelle brièvement le poste visé et la date de candidature, et réitère l'intérêt pour le poste sans être insistant.
- Si des relances ont déjà été envoyées, tiens-en compte sans répéter le contenu d'une relance précédente.
- N'invente aucune information non fournie ci-dessus.
- Réponds UNIQUEMENT avec le corps du message — pas d'objet, pas de markdown, pas de formule d'introduction du type « Voici le message », pas de guillemets autour.`;
}

export async function generateFollowupDraft(
	context: FollowupContext,
	profile: object,
	language: Locale = 'fr'
): Promise<string> {
	const prompt = buildFollowupPrompt(context, profile, language);
	return runClaudeForText(prompt, ['--disallowedTools', DISALLOWED_TOOLS]);
}

export async function extractProfileFromFile(filePath: string, language: Locale = 'fr'): Promise<object> {
	const prompt = buildProfileExtractionPromptFromFile(filePath, language);
	return runClaudeForJson(prompt, ['--allowedTools', 'Read']) as Promise<object>;
}

export async function extractProfileFromText(cvText: string, language: Locale = 'fr'): Promise<object> {
	const prompt = buildProfileExtractionPromptFromText(cvText, language);
	return runClaudeForJson(prompt, ['--disallowedTools', DISALLOWED_TOOLS]) as Promise<object>;
}
