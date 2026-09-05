import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { Application } from './types';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'applications.db');
const SCHEMA_PATH = path.join(process.cwd(), '..', 'tracker', 'schema.sql');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
	if (!db) {
		fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
		db = new DatabaseSync(DB_PATH);
		db.exec('PRAGMA foreign_keys = ON');
		db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
	}
	return db;
}

export function listApplications(statusFilter?: string): Application[] {
	const database = getDb();
	if (statusFilter) {
		return database
			.prepare('SELECT * FROM applications WHERE status = ? ORDER BY application_date DESC')
			.all(statusFilter) as unknown as Application[];
	}
	return database
		.prepare('SELECT * FROM applications ORDER BY application_date DESC')
		.all() as unknown as Application[];
}

export interface NewApplication {
	company: string;
	role: string;
	offer_source?: string | null;
	status: string;
	cv_file_path?: string | null;
	cover_letter_file_path?: string | null;
}

export function insertApplication(app: NewApplication): number {
	const database = getDb();
	const today = new Date().toISOString().slice(0, 10);
	const result = database
		.prepare(
			`INSERT INTO applications
				(company, role, offer_source, application_date, status, cv_file_path, cover_letter_file_path)
			VALUES (?, ?, ?, ?, ?, ?, ?)`
		)
		.run(
			app.company,
			app.role,
			app.offer_source ?? null,
			today,
			app.status,
			app.cv_file_path ?? null,
			app.cover_letter_file_path ?? null
		);
	const applicationId = Number(result.lastInsertRowid);
	recordStatusChange(applicationId, app.status);
	return applicationId;
}

export function updateStatus(applicationId: number, status: string): void {
	const database = getDb();
	database.prepare('UPDATE applications SET status = ? WHERE id = ?').run(status, applicationId);
	recordStatusChange(applicationId, status);
}

export function updateNotes(applicationId: number, notes: string): void {
	const database = getDb();
	database.prepare('UPDATE applications SET notes = ? WHERE id = ?').run(notes, applicationId);
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

export type ApplicationWithHistory = Application & { history: StatusHistoryEntry[] };

export function listApplicationsWithHistory(): ApplicationWithHistory[] {
	return listApplications().map((app) => ({ ...app, history: listStatusHistory(app.id) }));
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
}

export interface NewWizardJob {
	language: string;
	offer_text: string;
	also_other_language?: boolean;
	generate_cover_letter?: boolean;
}

export function createJob(job: NewWizardJob): number {
	const database = getDb();
	const now = new Date().toISOString();
	const result = database
		.prepare(
			`INSERT INTO wizard_jobs
				(created_at, updated_at, status, language, offer_text, also_other_language, generate_cover_letter)
			VALUES (?, ?, 'analyzing', ?, ?, ?, ?)`
		)
		.run(
			now,
			now,
			job.language,
			job.offer_text,
			job.also_other_language ? 1 : 0,
			job.generate_cover_letter === false ? 0 : 1
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

export function updateJob(id: number, patch: JobPatch): void {
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
	values.push(id);
	database.prepare(`UPDATE wizard_jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function getJob(id: number): WizardJobRow | undefined {
	const database = getDb();
	const row = database.prepare('SELECT * FROM wizard_jobs WHERE id = ?').get(id) as WizardJobRow | undefined;
	return row ? { ...row } : undefined;
}

export function listJobs(): WizardJobRow[] {
	const database = getDb();
	const rows = database.prepare('SELECT * FROM wizard_jobs ORDER BY created_at DESC').all() as unknown as WizardJobRow[];
	return rows.map((row) => ({ ...row }));
}
