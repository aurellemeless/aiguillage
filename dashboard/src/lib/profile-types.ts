import { ExperienceBlock, SkillLine } from './types';

export interface ProfileIdentity {
	name: string;
	title: string;
	years_experience: number | string;
	location: string;
	email: string;
	phone: string;
	github: string;
	linkedin: string;
}

export interface ProfileEducation {
	degree: string;
	institution: string;
	year: string;
}

export interface ProfileCertification {
	name: string;
	organization: string;
	year: string;
	note?: string;
}

export interface ProfileLanguage {
	language: string;
	level: string;
}

export interface ProfileDepthNote {
	skill: string;
	level: string;
	note: string;
}

export interface ProfilePersonalProject {
	name: string;
	description: string;
	status?: string;
	tech: string[];
	[key: string]: unknown;
}

export interface ProfileData {
	identity: ProfileIdentity;
	skills: Record<string, string[]>;
	skills_depth_notes: ProfileDepthNote[];
	experience: ExperienceBlock[];
	education: ProfileEducation[];
	certifications: ProfileCertification[];
	personal_projects: ProfilePersonalProject[];
	languages: ProfileLanguage[];
	driving_license: string;
	[key: string]: unknown;
}

const EMPTY_IDENTITY: ProfileIdentity = {
	name: '',
	title: '',
	years_experience: '',
	location: '',
	email: '',
	phone: '',
	github: '',
	linkedin: '',
};

// Fills in any fields missing from a raw profile.json / extraction result so
// the form always has a predictable shape to render, without silently
// dropping fields the source JSON doesn't otherwise know about.
export function normalizeProfile(raw: unknown): ProfileData {
	const data = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}) as Partial<ProfileData>;
	return {
		...data,
		identity: { ...EMPTY_IDENTITY, ...(data.identity as Partial<ProfileIdentity>) },
		skills: (data.skills as Record<string, string[]>) ?? {},
		skills_depth_notes: Array.isArray(data.skills_depth_notes) ? data.skills_depth_notes : [],
		experience: Array.isArray(data.experience) ? data.experience : [],
		education: Array.isArray(data.education) ? data.education : [],
		certifications: Array.isArray(data.certifications) ? data.certifications : [],
		personal_projects: Array.isArray(data.personal_projects) ? data.personal_projects : [],
		languages: Array.isArray(data.languages) ? data.languages : [],
		driving_license: typeof data.driving_license === 'string' ? data.driving_license : '',
	} as ProfileData;
}

export function skillsToLines(skills: Record<string, string[]>): SkillLine[] {
	return Object.entries(skills).map(([label, values]) => ({ label, values }));
}

export function linesToSkills(lines: SkillLine[]): Record<string, string[]> {
	const result: Record<string, string[]> = {};
	for (const line of lines) {
		if (line.label.trim()) result[line.label.trim()] = line.values;
	}
	return result;
}
