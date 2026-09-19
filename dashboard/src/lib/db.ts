import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { Application, FitDecision } from './types';
import { computeNextFollowupDate } from './followup';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'applications.db');
const SCHEMA_PATH = path.join(process.cwd(), '..', 'tracker', 'schema.sql');
const MIGRATIONS_DIR = path.join(process.cwd(), '..', 'tracker', 'migrations');

let db: DatabaseSync | null = null;

// Brings an existing database up to date with schema.sql's current shape.
// Each statement is applied individually so a column already added on a
// previous run (or by a fresh schema.sql on a new install) is simply
// skipped, never aborting the rest of the migration.
function applyMigrations(database: DatabaseSync): void {
	const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
	for (const file of files) {
		const sql = fs
			.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')
			.split('\n')
			.filter((line) => !line.trim().startsWith('--'))
			.join('\n');
		const statements = sql
			.split(';')
			.map((s) => s.trim())
			.filter(Boolean);
		for (const statement of statements) {
			try {
				database.exec(statement);
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				if (!message.includes('duplicate column name')) throw err;
			}
		}
	}
}

export function getDb(): DatabaseSync {
	if (!db) {
		fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
		db = new DatabaseSync(DB_PATH);
		db.exec('PRAGMA foreign_keys = ON');
		db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
		applyMigrations(db);
	}
	return db;
}

export function listApplications(profileSlug: string, statusFilter?: string): Application[] {
	const database = getDb();
	if (statusFilter) {
		return database
			.prepare('SELECT * FROM applications WHERE profile_slug = ? AND status = ? ORDER BY application_date DESC')
			.all(profileSlug, statusFilter) as unknown as Application[];
	}
	return database
		.prepare('SELECT * FROM applications WHERE profile_slug = ? ORDER BY application_date DESC')
		.all(profileSlug) as unknown as Application[];
}

export function getApplication(id: number, profileSlug: string): Application | undefined {
	const database = getDb();
	const row = database
		.prepare('SELECT * FROM applications WHERE id = ? AND profile_slug = ?')
		.get(id, profileSlug) as Application | undefined;
	return row ? { ...row } : undefined;
}

export interface NewApplication {
	company: string;
	role: string;
	offer_source?: string | null;
	offer_text?: string | null;
	status: string;
	cv_file_path?: string | null;
	cover_letter_file_path?: string | null;
	profile_slug: string;
	fit_score?: number | null;
	fit_decision?: string | null;
	fit_json?: string | null;
	application_date?: string;
}

export function insertApplication(app: NewApplication): number {
	const database = getDb();
	const applicationDate = app.application_date ?? new Date().toISOString().slice(0, 10);
	const delay = getProfileSettings(app.profile_slug).default_followup_delay_days;
	const nextFollowupDate = computeNextFollowupDate(applicationDate, delay);
	const result = database
		.prepare(
			`INSERT INTO applications
				(company, role, offer_source, offer_text, application_date, status, cv_file_path, cover_letter_file_path, profile_slug, followup_delay_days, next_followup_date, fit_score, fit_decision, fit_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			app.company,
			app.role,
			app.offer_source ?? null,
			app.offer_text ?? null,
			applicationDate,
			app.status,
			app.cv_file_path ?? null,
			app.cover_letter_file_path ?? null,
			app.profile_slug,
			delay,
			nextFollowupDate,
			app.fit_score ?? null,
			app.fit_decision ?? null,
			app.fit_json ?? null
		);
	const applicationId = Number(result.lastInsertRowid);
	recordStatusChange(applicationId, app.status);
	return applicationId;
}

export interface Followup {
	id: number;
	application_id: number;
	followed_up_at: string;
	note: string | null;
}

export function listFollowups(applicationId: number): Followup[] {
	const database = getDb();
	const rows = database
		.prepare('SELECT * FROM followups WHERE application_id = ? ORDER BY followed_up_at DESC, id DESC')
		.all(applicationId) as unknown as Followup[];
	return rows.map((row) => ({ ...row }));
}

export function createFollowup(applicationId: number, profileSlug: string, note: string | null): Followup | undefined {
	const database = getDb();
	const app = getApplication(applicationId, profileSlug);
	if (!app) return undefined;

	const now = new Date().toISOString();
	const result = database
		.prepare('INSERT INTO followups (application_id, followed_up_at, note) VALUES (?, ?, ?)')
		.run(applicationId, now, note);

	const nextFollowupDate = computeNextFollowupDate(now.slice(0, 10), app.followup_delay_days);
	database.prepare('UPDATE applications SET next_followup_date = ? WHERE id = ?').run(nextFollowupDate, applicationId);

	return { id: Number(result.lastInsertRowid), application_id: applicationId, followed_up_at: now, note };
}

export function updateFollowupDelay(applicationId: number, profileSlug: string, days: number): boolean {
	const database = getDb();
	const app = getApplication(applicationId, profileSlug);
	if (!app) return false;

	const lastFollowup = listFollowups(applicationId)[0];
	const referenceDate = lastFollowup ? lastFollowup.followed_up_at.slice(0, 10) : app.application_date;
	const nextFollowupDate = referenceDate ? computeNextFollowupDate(referenceDate, days) : null;

	database
		.prepare('UPDATE applications SET followup_delay_days = ?, next_followup_date = ? WHERE id = ? AND profile_slug = ?')
		.run(days, nextFollowupDate, applicationId, profileSlug);
	return true;
}

export interface ProfileSettings {
	default_followup_delay_days: number;
}

const DEFAULT_PROFILE_SETTINGS: ProfileSettings = { default_followup_delay_days: 10 };

export function getProfileSettings(profileSlug: string): ProfileSettings {
	const database = getDb();
	const row = database
		.prepare('SELECT default_followup_delay_days FROM profile_settings WHERE profile_slug = ?')
		.get(profileSlug) as ProfileSettings | undefined;
	return row ?? DEFAULT_PROFILE_SETTINGS;
}

export function setDefaultFollowupDelay(profileSlug: string, days: number): void {
	const database = getDb();
	database
		.prepare(
			`INSERT INTO profile_settings (profile_slug, default_followup_delay_days) VALUES (?, ?)
			 ON CONFLICT(profile_slug) DO UPDATE SET default_followup_delay_days = excluded.default_followup_delay_days`
		)
		.run(profileSlug, days);
}

export type ScanStatus = 'scanning' | 'done' | 'error';

export interface ProfileSearchSettings {
	keywords: string[];
	location: string | null;
	min_fit_score: number;
	sources: string[];
	last_scan_at: string | null;
	last_scan_status: ScanStatus | null;
	last_scan_error: string | null;
	last_scan_found: number | null;
	last_scan_new: number | null;
}

interface SearchSettingsRow {
	search_keywords: string;
	search_location: string | null;
	search_min_fit_score: number;
	search_sources: string;
	last_scan_at: string | null;
	last_scan_status: ScanStatus | null;
	last_scan_error: string | null;
	last_scan_found: number | null;
	last_scan_new: number | null;
}

function parseJsonArray(value: string | null | undefined): string[] {
	if (!value) return [];
	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
	} catch {
		return [];
	}
}

export function getProfileSearchSettings(profileSlug: string): ProfileSearchSettings {
	const database = getDb();
	const row = database
		.prepare(
			`SELECT search_keywords, search_location, search_min_fit_score, search_sources,
			        last_scan_at, last_scan_status, last_scan_error, last_scan_found, last_scan_new
			 FROM profile_settings WHERE profile_slug = ?`
		)
		.get(profileSlug) as SearchSettingsRow | undefined;

	if (!row) {
		return { keywords: [], location: null, min_fit_score: 70, sources: ['france_travail'], last_scan_at: null, last_scan_status: null, last_scan_error: null, last_scan_found: null, last_scan_new: null };
	}
	return {
		keywords: parseJsonArray(row.search_keywords),
		location: row.search_location,
		min_fit_score: row.search_min_fit_score,
		sources: parseJsonArray(row.search_sources),
		last_scan_at: row.last_scan_at,
		last_scan_status: row.last_scan_status,
		last_scan_error: row.last_scan_error,
		last_scan_found: row.last_scan_found,
		last_scan_new: row.last_scan_new,
	};
}

export function setProfileSearchSettings(
	profileSlug: string,
	settings: { keywords: string[]; location: string | null; minFitScore: number; sources: string[] }
): void {
	const database = getDb();
	database
		.prepare(
			`INSERT INTO profile_settings (profile_slug, search_keywords, search_location, search_min_fit_score, search_sources)
			 VALUES (?, ?, ?, ?, ?)
			 ON CONFLICT(profile_slug) DO UPDATE SET
			   search_keywords = excluded.search_keywords,
			   search_location = excluded.search_location,
			   search_min_fit_score = excluded.search_min_fit_score,
			   search_sources = excluded.search_sources`
		)
		.run(profileSlug, JSON.stringify(settings.keywords), settings.location, settings.minFitScore, JSON.stringify(settings.sources));
}

export function recordScanStart(profileSlug: string): void {
	const database = getDb();
	database
		.prepare(
			`INSERT INTO profile_settings (profile_slug, last_scan_at, last_scan_status, last_scan_error)
			 VALUES (?, ?, 'scanning', NULL)
			 ON CONFLICT(profile_slug) DO UPDATE SET last_scan_at = excluded.last_scan_at, last_scan_status = 'scanning', last_scan_error = NULL`
		)
		.run(profileSlug, new Date().toISOString());
}

export function recordScanResult(profileSlug: string, result: { found: number; new: number } | { error: string }): void {
	const database = getDb();
	if ('error' in result) {
		database
			.prepare(`UPDATE profile_settings SET last_scan_status = 'error', last_scan_error = ? WHERE profile_slug = ?`)
			.run(result.error, profileSlug);
		return;
	}
	database
		.prepare(
			`UPDATE profile_settings SET last_scan_status = 'done', last_scan_error = NULL, last_scan_found = ?, last_scan_new = ? WHERE profile_slug = ?`
		)
		.run(result.found, result.new, profileSlug);
}

export function updateStatus(applicationId: number, status: string, profileSlug: string): void {
	const database = getDb();
	database
		.prepare('UPDATE applications SET status = ? WHERE id = ? AND profile_slug = ?')
		.run(status, applicationId, profileSlug);
	recordStatusChange(applicationId, status);
}

export function updateNotes(applicationId: number, notes: string, profileSlug: string): void {
	const database = getDb();
	database
		.prepare('UPDATE applications SET notes = ? WHERE id = ? AND profile_slug = ?')
		.run(notes, applicationId, profileSlug);
}

export interface StatusHistoryEntry {
	id: number;
	status: string;
	changed_at: string;
}

export function listStatusHistory(applicationId: number): StatusHistoryEntry[] {
	const database = getDb();
	const rows = database
		.prepare('SELECT id, status, changed_at FROM status_history WHERE application_id = ? ORDER BY changed_at DESC')
		.all(applicationId) as unknown as StatusHistoryEntry[];
	return rows.map((row) => ({ ...row }));
}

export type ApplicationWithHistory = Application & { history: StatusHistoryEntry[]; followups: Followup[] };

export function listApplicationsWithHistory(profileSlug: string): ApplicationWithHistory[] {
	return listApplications(profileSlug).map((app) => ({
		...app,
		history: listStatusHistory(app.id),
		followups: listFollowups(app.id),
	}));
}

function recordStatusChange(applicationId: number, status: string): void {
	const database = getDb();
	database
		.prepare('INSERT INTO status_history (application_id, status, changed_at) VALUES (?, ?, ?)')
		.run(applicationId, status, new Date().toISOString());
}

export type JobStatus = 'analyzing' | 'ready' | 'generating' | 'done' | 'error';

export interface WizardJobRow {
	id: number;
	created_at: string;
	updated_at: string;
	status: JobStatus;
	language: string;
	offer_text: string;
	also_other_language: number;
	generate_cover_letter: number;
	result_json: string | null;
	error_message: string | null;
	application_id: number | null;
	cv_path: string | null;
	cover_letter_path: string | null;
	profile_slug: string;
}

export interface NewWizardJob {
	language: string;
	offer_text: string;
	also_other_language?: boolean;
	generate_cover_letter?: boolean;
	profile_slug: string;
}

export function createJob(job: NewWizardJob): number {
	const database = getDb();
	const now = new Date().toISOString();
	const result = database
		.prepare(
			`INSERT INTO wizard_jobs
				(created_at, updated_at, status, language, offer_text, also_other_language, generate_cover_letter, profile_slug)
			VALUES (?, ?, 'analyzing', ?, ?, ?, ?, ?)`
		)
		.run(
			now,
			now,
			job.language,
			job.offer_text,
			job.also_other_language ? 1 : 0,
			job.generate_cover_letter === false ? 0 : 1,
			job.profile_slug
		);
	return Number(result.lastInsertRowid);
}

export interface JobPatch {
	status?: JobStatus;
	also_other_language?: boolean;
	generate_cover_letter?: boolean;
	result_json?: string | null;
	error_message?: string | null;
	application_id?: number | null;
	cv_path?: string | null;
	cover_letter_path?: string | null;
}

export function updateJob(id: number, patch: JobPatch, profileSlug: string): void {
	const database = getDb();
	const fields: string[] = [];
	const values: (string | number | null)[] = [];
	for (const [key, value] of Object.entries(patch)) {
		fields.push(`${key} = ?`);
		values.push(typeof value === 'boolean' ? (value ? 1 : 0) : (value as string | number | null));
	}
	if (fields.length === 0) return;
	fields.push('updated_at = ?');
	values.push(new Date().toISOString());
	values.push(id, profileSlug);
	database.prepare(`UPDATE wizard_jobs SET ${fields.join(', ')} WHERE id = ? AND profile_slug = ?`).run(...values);
}

export function getJob(id: number, profileSlug: string): WizardJobRow | undefined {
	const database = getDb();
	const row = database
		.prepare('SELECT * FROM wizard_jobs WHERE id = ? AND profile_slug = ?')
		.get(id, profileSlug) as WizardJobRow | undefined;
	return row ? { ...row } : undefined;
}

export function listJobs(profileSlug: string): WizardJobRow[] {
	const database = getDb();
	const rows = database
		.prepare('SELECT * FROM wizard_jobs WHERE profile_slug = ? ORDER BY created_at DESC')
		.all(profileSlug) as unknown as WizardJobRow[];
	return rows.map((row) => ({ ...row }));
}

export type OfferStatus = 'new' | 'dismissed' | 'applied';

export interface DiscoveredOffer {
	id: number;
	profile_slug: string;
	source: string;
	external_id: string;
	url: string | null;
	title: string;
	company: string | null;
	location: string | null;
	contract_type: string | null;
	posted_date: string | null;
	raw_text: string;
	fit_score: number;
	fit_decision: FitDecision;
	fit_json: string;
	status: OfferStatus;
	application_id: number | null;
	discovered_at: string;
}

export function offerExists(profileSlug: string, source: string, externalId: string): boolean {
	const database = getDb();
	const row = database
		.prepare('SELECT 1 FROM discovered_offers WHERE profile_slug = ? AND source = ? AND external_id = ?')
		.get(profileSlug, source, externalId);
	return !!row;
}

export interface NewDiscoveredOffer {
	profile_slug: string;
	source: string;
	external_id: string;
	url: string | null;
	title: string;
	company: string | null;
	location: string | null;
	contract_type: string | null;
	posted_date: string | null;
	raw_text: string;
	fit_score: number;
	fit_decision: FitDecision;
	fit_json: string;
}

export function insertDiscoveredOffer(offer: NewDiscoveredOffer): void {
	const database = getDb();
	database
		.prepare(
			`INSERT INTO discovered_offers
				(profile_slug, source, external_id, url, title, company, location, contract_type, posted_date, raw_text, fit_score, fit_decision, fit_json, status, discovered_at)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
			ON CONFLICT(profile_slug, source, external_id) DO NOTHING`
		)
		.run(
			offer.profile_slug,
			offer.source,
			offer.external_id,
			offer.url,
			offer.title,
			offer.company,
			offer.location,
			offer.contract_type,
			offer.posted_date,
			offer.raw_text,
			offer.fit_score,
			offer.fit_decision,
			offer.fit_json,
			new Date().toISOString()
		);
}

// "new" respects the profile's *current* min-fit-score setting (raising or
// lowering the threshold later re-surfaces already-fetched offers without a
// re-scan); "dismissed"/"applied" are explicit user actions and always show.
export function listDiscoveredOffers(profileSlug: string, status: OfferStatus): DiscoveredOffer[] {
	const database = getDb();
	if (status === 'new') {
		const minScore = getProfileSearchSettings(profileSlug).min_fit_score;
		return database
			.prepare(
				`SELECT * FROM discovered_offers WHERE profile_slug = ? AND status = 'new' AND fit_score >= ? ORDER BY fit_score DESC, discovered_at DESC`
			)
			.all(profileSlug, minScore) as unknown as DiscoveredOffer[];
	}
	return database
		.prepare(`SELECT * FROM discovered_offers WHERE profile_slug = ? AND status = ? ORDER BY discovered_at DESC`)
		.all(profileSlug, status) as unknown as DiscoveredOffer[];
}

export function countNewDiscoveredOffers(profileSlug: string): number {
	return listDiscoveredOffers(profileSlug, 'new').length;
}

export function getDiscoveredOffer(id: number, profileSlug: string): DiscoveredOffer | undefined {
	const database = getDb();
	const row = database
		.prepare('SELECT * FROM discovered_offers WHERE id = ? AND profile_slug = ?')
		.get(id, profileSlug) as DiscoveredOffer | undefined;
	return row ? { ...row } : undefined;
}

export function updateDiscoveredOfferStatus(
	id: number,
	profileSlug: string,
	status: OfferStatus,
	applicationId?: number
): void {
	const database = getDb();
	database
		.prepare('UPDATE discovered_offers SET status = ?, application_id = ? WHERE id = ? AND profile_slug = ?')
		.run(status, applicationId ?? null, id, profileSlug);
}
