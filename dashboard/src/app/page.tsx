import NextLink from 'next/link';
import { listApplicationsWithHistory } from '@/lib/db';
import { isFollowupDue } from '@/lib/followup';
import { daysSince, formatDate, formatDateTime } from '@/lib/status';
import { dayPrefix, getDict, statusLabel } from '@/lib/i18n';
import { getServerLocale } from '@/lib/server-locale';

export const dynamic = 'force-dynamic';

const ACTIVE_STATUSES_EXCLUDED = new Set(['Refusé', 'Sans réponse/Abandonné']);
const INTERVIEW_STATUSES = new Set(['Entretien RH', 'Entretien technique']);

export default async function DashboardPage() {
	const locale = await getServerLocale();
	const t = getDict(locale);
	const applications = listApplicationsWithHistory();

	const total = applications.length;
	const active = applications.filter((a) => !ACTIVE_STATUSES_EXCLUDED.has(a.status)).length;
	const waiting = applications.filter((a) => a.status === 'Envoyé').length;
	const interviews = applications.filter((a) => INTERVIEW_STATUSES.has(a.status)).length;

	const sent = applications.filter((a) => a.status !== 'Brouillon').length;
	const responded = applications.filter((a) => a.status !== 'Brouillon' && a.status !== 'Envoyé').length;
	const responseRate = sent > 0 ? Math.round((responded / sent) * 100) : 0;

	const toFollowUp = applications
		.filter((a) => isFollowupDue(a.status, a.application_date, a.followup_delay_days))
		.sort((a, b) => (a.application_date ?? '').localeCompare(b.application_date ?? ''));

	const recentActivity = applications
		.flatMap((a) => a.history.map((h) => ({ ...h, company: a.company, role: a.role })))
		.sort((a, b) => b.changed_at.localeCompare(a.changed_at))
		.slice(0, 6);

	return (
		<div>
			<div className='topbar'>
				<h1>{t.dashboard.title}</h1>
				<div className='search'>⌕ {t.common.search}</div>
				<NextLink href='/nouvelle' className='btn'>
					{t.common.newApplicationBtn}
				</NextLink>
			</div>

			<div className='content'>
				<div className='kpi-row'>
					<div className='kpi'>
						<div className='label'>{t.dashboard.kpiActive}</div>
						<div className='value font-mono'>{active}</div>
						<div className='sub'>{t.dashboard.kpiActiveSub(total)}</div>
					</div>
					<div className='kpi'>
						<div className='label'>{t.dashboard.kpiWaiting}</div>
						<div className='value font-mono'>{waiting}</div>
						<div className='sub'>{t.dashboard.kpiWaitingSub}</div>
					</div>
					<div className='kpi'>
						<div className='label'>{t.dashboard.kpiInterviews}</div>
						<div className='value font-mono'>{interviews}</div>
						<div className='sub'>{t.dashboard.kpiInterviewsSub}</div>
					</div>
					<div className='kpi'>
						<div className='label'>{t.dashboard.kpiResponseRate}</div>
						<div className='value font-mono'>{responseRate}%</div>
						<div className='sub'>{t.dashboard.kpiResponseRateSub}</div>
					</div>
				</div>

				<div className='grid-2'>
					<div className='panel'>
						<div className='panel-head'>
							<h2>{t.dashboard.followUp}</h2>
							{toFollowUp.length > 0 && <span className='stamp relance'>{t.dashboard.followUpBadge(toFollowUp.length)}</span>}
						</div>
						<div className='panel-body'>
							{toFollowUp.length === 0 && <div className='panel-empty'>{t.dashboard.followUpEmpty}</div>}
							{toFollowUp.map((app) => (
								<div className='relance-item' key={app.id}>
									<div className='who'>
										<b>{app.company}</b>
										<span>{t.dashboard.followUpItem(app.role, formatDate(app.application_date, locale))}</span>
									</div>
									<div className='days font-mono'>
										{dayPrefix(locale)}+{daysSince(app.application_date)}
									</div>
									<NextLink href={`/applications?open=${app.id}`} className='btn subtle'>
										{t.dashboard.open}
									</NextLink>
								</div>
							))}
						</div>
					</div>

					<div className='panel'>
						<div className='panel-head'>
							<h2>{t.dashboard.recentActivity}</h2>
						</div>
						<div className='timeline'>
							{recentActivity.length === 0 && <div className='panel-empty'>{t.dashboard.recentActivityEmpty}</div>}
							{recentActivity.map((entry) => (
								<div className='tl-item' key={entry.id}>
									<div className='tl-dot' />
									<div>
										<div className='tl-date font-mono'>{formatDateTime(entry.changed_at, locale)}</div>
											<div className='tl-text'>
											<b>{entry.company}</b> — {t.dashboard.statusArrow} {statusLabel(entry.status, locale)}
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
