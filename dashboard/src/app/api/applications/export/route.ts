import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { listApplicationsWithHistory } from '@/lib/db';
import { getDict, statusLabel } from '@/lib/i18n';
import { getServerLocale } from '@/lib/server-locale';
import { getServerProfileSlug } from '@/lib/server-profile';

function toDate(value: string | null): Date | null {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET() {
	const locale = await getServerLocale();
	const t = getDict(locale);
	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) return NextResponse.json({ error: 'Aucun profil actif.' }, { status: 400 });
	const applications = listApplicationsWithHistory(profileSlug);

	const dateFmt = locale === 'en' ? 'mm/dd/yyyy' : 'dd/mm/yyyy';
	const dateTimeFmt = locale === 'en' ? 'mm/dd/yyyy hh:mm' : 'dd/mm/yyyy hh:mm';

	const workbook = new ExcelJS.Workbook();
	workbook.creator = 'Aiguillage';
	workbook.created = new Date();

	const sheet = workbook.addWorksheet(t.export.sheetApplications);
	sheet.columns = [
		{ header: t.export.colId, key: 'id', width: 8 },
		{ header: t.export.colCompany, key: 'company', width: 24 },
		{ header: t.export.colRole, key: 'role', width: 28 },
		{ header: t.export.colStatus, key: 'status', width: 20 },
		{ header: t.export.colSource, key: 'source', width: 16 },
		{ header: t.export.colAppliedOn, key: 'appliedOn', width: 14 },
		{ header: t.export.colOfferDate, key: 'offerDate', width: 14 },
		{ header: t.export.colNextFollowUp, key: 'nextFollowUp', width: 16 },
		{ header: t.export.colFollowUpDelay, key: 'followUpDelay', width: 12 },
		{ header: t.export.colContact, key: 'contact', width: 22 },
		{ header: t.export.colNotes, key: 'notes', width: 40 },
		{ header: t.export.colCvPath, key: 'cvPath', width: 44 },
		{ header: t.export.colCoverLetterPath, key: 'letterPath', width: 44 },
		{ header: t.export.colCvVersion, key: 'cvVersion', width: 10 },
	];
	sheet.getRow(1).font = { bold: true };
	sheet.views = [{ state: 'frozen', ySplit: 1 }];

	for (const app of applications) {
		const row = sheet.addRow({
			id: app.id,
			company: app.company,
			role: app.role,
			status: statusLabel(app.status, locale),
			source: app.offer_source ?? '',
			appliedOn: toDate(app.application_date),
			offerDate: toDate(app.offer_date),
			nextFollowUp: toDate(app.next_followup_date),
			followUpDelay: app.followup_delay_days,
			contact: app.recruiter_contact ?? '',
			notes: app.notes ?? '',
			cvPath: app.cv_file_path ?? '',
			letterPath: app.cover_letter_file_path ?? '',
			cvVersion: app.cv_version,
		});
		for (const key of ['appliedOn', 'offerDate', 'nextFollowUp']) {
			const cell = row.getCell(key);
			if (cell.value instanceof Date) cell.numFmt = dateFmt;
		}
	}

	const historySheet = workbook.addWorksheet(t.export.sheetHistory);
	historySheet.columns = [
		{ header: t.export.histColApplicationId, key: 'appId', width: 14 },
		{ header: t.export.histColCompany, key: 'company', width: 24 },
		{ header: t.export.histColRole, key: 'role', width: 28 },
		{ header: t.export.histColStatus, key: 'status', width: 20 },
		{ header: t.export.histColChangedAt, key: 'changedAt', width: 20 },
	];
	historySheet.getRow(1).font = { bold: true };
	historySheet.views = [{ state: 'frozen', ySplit: 1 }];

	for (const app of applications) {
		for (const entry of app.history) {
			const row = historySheet.addRow({
				appId: app.id,
				company: app.company,
				role: app.role,
				status: statusLabel(entry.status, locale),
				changedAt: new Date(entry.changed_at),
			});
			row.getCell('changedAt').numFmt = dateTimeFmt;
		}
	}

	const buffer = await workbook.xlsx.writeBuffer();
	const filename = `${t.export.filename}-${new Date().toISOString().slice(0, 10)}.xlsx`;

	return new NextResponse(buffer, {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`,
		},
	});
}
