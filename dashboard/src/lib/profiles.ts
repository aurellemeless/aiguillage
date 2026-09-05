import fs from 'node:fs';
import path from 'node:path';
import { slugify } from './followup';
import { normalizeProfile, ProfileData } from './profile-types';

const PROFILE_DIR = path.join(process.cwd(), '..', 'profile');
const PROFILES_DIR = path.join(PROFILE_DIR, 'profiles');
const LEGACY_PROFILE_PATH = path.join(PROFILE_DIR, 'profile.json');
const DEFAULT_SLUG_FILE = path.join(PROFILE_DIR, 'default-profile.json');

export const DEFAULT_PROFILE_SLUG = 'default';

function profilePath(slug: string): string {
	return path.join(PROFILES_DIR, `${slug}.json`);
}

// One-time migration: an existing single-profile install had everything in
// profile/profile.json — move it in as the first profile, never delete data.
function ensureMigrated(): void {
	if (fs.existsSync(PROFILES_DIR)) return;
	fs.mkdirSync(PROFILES_DIR, { recursive: true });
	if (fs.existsSync(LEGACY_PROFILE_PATH)) {
		fs.renameSync(LEGACY_PROFILE_PATH, profilePath(DEFAULT_PROFILE_SLUG));
	}
}

export interface ProfileSummary {
	slug: string;
	label: string;
	isDefault: boolean;
}

function labelFor(slug: string, data: ProfileData): string {
	return data.profile_label?.trim() || data.identity?.name?.trim() || slug;
}

export function getDefaultProfileSlug(): string | null {
	if (!fs.existsSync(DEFAULT_SLUG_FILE)) return null;
	try {
		const { slug } = JSON.parse(fs.readFileSync(DEFAULT_SLUG_FILE, 'utf-8'));
		return typeof slug === 'string' && fs.existsSync(profilePath(slug)) ? slug : null;
	} catch {
		return null;
	}
}

export function setDefaultProfileSlug(slug: string): void {
	fs.mkdirSync(PROFILE_DIR, { recursive: true });
	fs.writeFileSync(DEFAULT_SLUG_FILE, JSON.stringify({ slug }, null, 2) + '\n', 'utf-8');
}

export function listProfiles(): ProfileSummary[] {
	ensureMigrated();
	const files = fs.readdirSync(PROFILES_DIR).filter((f) => f.endsWith('.json'));
	const defaultSlug = getDefaultProfileSlug();
	return files
		.map((file) => {
			const slug = file.slice(0, -'.json'.length);
			const data = normalizeProfile(JSON.parse(fs.readFileSync(profilePath(slug), 'utf-8')));
			return { slug, label: labelFor(slug, data), isDefault: slug === defaultSlug };
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}

export function getProfile(slug: string): ProfileData | null {
	ensureMigrated();
	const file = profilePath(slug);
	if (!fs.existsSync(file)) return null;
	return normalizeProfile(JSON.parse(fs.readFileSync(file, 'utf-8')));
}

export function saveProfile(slug: string, data: ProfileData): void {
	ensureMigrated();
	fs.mkdirSync(PROFILES_DIR, { recursive: true });
	fs.writeFileSync(profilePath(slug), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function uniqueSlug(base: string): string {
	const existing = new Set(listProfiles().map((p) => p.slug));
	let slug = base || 'profil';
	let i = 2;
	while (existing.has(slug)) {
		slug = `${base}-${i}`;
		i += 1;
	}
	return slug;
}

export function createProfile(label: string): string {
	ensureMigrated();
	const slug = uniqueSlug(slugify(label));
	const data = normalizeProfile({});
	data.profile_label = label;
	data.identity.name = label;
	saveProfile(slug, data);
	return slug;
}
