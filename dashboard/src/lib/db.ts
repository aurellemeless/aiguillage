import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { Application } from './types';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'applications.db');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
	if (!db) {
		fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
		db = new DatabaseSync(DB_PATH);
		db.exec('PRAGMA foreign_keys = ON');
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
