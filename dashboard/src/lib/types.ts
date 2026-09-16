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

export type FitResult = 'excellent' | 'good' | 'weak' | 'missing' | 'not_required';
export type FitDecision = 'apply' | 'maybe' | 'skip';
export type FitCategoryKey = 'must_have' | 'nice_to_have' | 'domain_experience' | 'constraints' | 'seniority';

export interface FitCriterion {
	label: string;
	result: FitResult;
}

export interface FitCategory {
	category: FitCategoryKey;
	criteria: FitCriterion[];
}

export interface JobFit {
	score: number;
	decision: FitDecision;
	categories: FitCategory[];
	reasons: string[];
}

export interface ProposedContent {
	company: string;
	role: string;
	cv: CvContent;
	cover_letter: CoverLetterContent;
	fit: JobFit;
}

export interface Application {
	id: number;
	company: string;
	role: string;
	offer_source: string | null;
	offer_text: string | null;
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
	fit_score: number | null;
	fit_decision: FitDecision | null;
	fit_json: string | null;
}

export const STATUSES = [
	'draft',
	'sent',
	'response_received',
	'hr_interview',
	'technical_interview',
	'offer_received',
	'rejected',
	'no_response_abandoned',
] as const;

export type Status = (typeof STATUSES)[number];
