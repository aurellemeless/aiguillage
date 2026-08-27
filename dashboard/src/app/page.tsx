import NextLink from 'next/link';
import { listApplicationsWithHistory } from '@/lib/db';
import { isFollowupDue } from '@/lib/followup';
import { daysSince, formatDateFr, formatDateTimeFr } from '@/lib/status';

export const dynamic = 'force-dynamic';

const ACTIVE_STATUSES_EXCLUDED = new Set(['Refusé', 'Sans réponse/Abandonné']);
const INTERVIEW_STATUSES = new Set(['Entretien RH', 'Entretien technique']);

export default function DashboardPage() {
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
				<h1>Tableau de bord</h1>
				<div className='search'>⌕ Rechercher une entreprise, un poste…</div>
				<NextLink href='/nouvelle' className='btn'>
					+ Nouvelle candidature
				</NextLink>
			</div>

			<div className='content'>
				<div className='kpi-row'>
					<div className='kpi'>
						<div className='label'>Candidatures actives</div>
						<div className='value font-mono'>{active}</div>
						<div className='sub'>sur {total} au total</div>
					</div>
					<div className='kpi'>
						<div className='label'>En attente de réponse</div>
						<div className='value font-mono'>{waiting}</div>
						<div className='sub'>depuis l&apos;envoi</div>
					</div>
					<div className='kpi'>
						<div className='label'>Entretiens en cours</div>
						<div className='value font-mono'>{interviews}</div>
						<div className='sub'>RH + technique</div>
					</div>
					<div className='kpi'>
						<div className='label'>Taux de réponse</div>
						<div className='value font-mono'>{responseRate}%</div>
						<div className='sub'>parmi les candidatures envoyées</div>
					</div>
				</div>

				<div className='grid-2'>
					<div className='panel'>
						<div className='panel-head'>
							<h2>À relancer</h2>
							{toFollowUp.length > 0 && <span className='stamp relance'>{toFollowUp.length} en attente</span>}
						</div>
						<div className='panel-body'>
							{toFollowUp.length === 0 && <div className='panel-empty'>Rien à relancer pour le moment.</div>}
							{toFollowUp.map((app) => (
								<div className='relance-item' key={app.id}>
									<div className='who'>
										<b>{app.company}</b>
										<span>
											{app.role} · envoyé le {formatDateFr(app.application_date)}
										</span>
									</div>
									<div className='days font-mono'>J+{daysSince(app.application_date)}</div>
									<NextLink href={`/applications?open=${app.id}`} className='btn subtle'>
										Ouvrir
									</NextLink>
								</div>
							))}
						</div>
					</div>

					<div className='panel'>
						<div className='panel-head'>
							<h2>Activité récente</h2>
						</div>
						<div className='timeline'>
							{recentActivity.length === 0 && <div className='panel-empty'>Aucune activité pour le moment.</div>}
							{recentActivity.map((entry) => (
								<div className='tl-item' key={entry.id}>
									<div className='tl-dot' />
									<div>
										<div className='tl-date font-mono'>{formatDateTimeFr(entry.changed_at)}</div>
										<div className='tl-text'>
											<b>{entry.company}</b> — statut → {entry.status}
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
