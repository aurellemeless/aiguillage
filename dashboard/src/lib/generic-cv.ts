import path from 'node:path';
import { ProfileData, skillsToLines } from './profile-types';
import { CvContent, ExperienceBlock } from './types';
import { candidateNameSlug } from './jobs';

const DATA_DIR = path.join(process.cwd(), '..', 'data', 'generated');

// Always the same path for a given profile+language: regenerating overwrites
// it rather than piling up dated files like application-specific CVs do.
export function genericCvPath(profileSlug: string, profile: ProfileData, language: string): string {
	return path.join(DATA_DIR, profileSlug, `CV_${candidateNameSlug(profile)}_${language}.docx`);
}

// Builds a CV directly from the profile, with no offer and no AI tailoring:
// every skill and every experience bullet as the candidate wrote them.
export function buildGenericCvContent(profile: ProfileData): CvContent {
	const personalProjects: ExperienceBlock[] = profile.personal_projects.map((project) => ({
		company: project.name,
		dates: typeof project.status === 'string' ? project.status : '',
		role: '',
		bullets: project.description ? [project.description] : [],
		tech: project.tech,
	}));

	return {
		headline: profile.identity.title,
		skills: skillsToLines(profile.skills),
		experience: profile.experience,
		personal_projects: personalProjects,
	};
}
