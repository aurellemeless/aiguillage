export interface SkillLine {
	label: string;
	values: string[];
}

export interface ExperienceBlock {
	company: string;
	dates: string;
	role: string;
	bullets: string[];
	tech: string[];
}

export interface CvContent {
	headline: string;
	tagline?: string;
	summary?: string;
	skills: SkillLine[];
	experience: ExperienceBlock[];
	personal_projects?: ExperienceBlock[];
}

export interface CoverLetterContent {
	recipient?: string;
	subject?: string;
	body: string[];
}

export interface ProposedContent {
	company: string;
	role: string;
	cv: CvContent;
	cover_letter: CoverLetterContent;
}

export interface Application {
	id: number;
	company: string;
	role: string;
	offer_source: string | null;
	offer_date: string | null;
	application_date: string | null;
	status: string;
	next_followup_date: string | null;
	followup_delay_days: number;
	notes: string | null;
	recruiter_contact: string | null;
	cv_file_path: string | null;
	cover_letter_file_path: string | null;
	cv_version: number;
	profile_slug: string;
}

export const STATUSES = [
	'Brouillon',
	'Envoyé',
	'Réponse reçue',
	'Entretien RH',
	'Entretien technique',
	'Offre reçue',
	'Refusé',
	'Sans réponse/Abandonné',
] as const;

export type Status = (typeof STATUSES)[number];
