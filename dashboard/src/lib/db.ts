import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { Application } from './types';
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
}

export function insertApplication(app: NewApplication): number {
	const database = getDb();
	const today = new Date().toISOString().slice(0, 10);
	const delay = getProfileSettings(app.profile_slug).default_followup_delay_days;
	const nextFollowupDate = computeNextFollowupDate(today, delay);
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
			today,
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
