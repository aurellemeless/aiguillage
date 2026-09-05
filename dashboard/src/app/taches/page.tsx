import NextLink from 'next/link';
import { listJobs, WizardJobRow } from '@/lib/db';
import { getDict } from '@/lib/i18n';
import { getServerLocale } from '@/lib/server-locale';
import { formatDateTime } from '@/lib/status';
import { ProposedContent } from '@/lib/types';
import MenuButton from '@/components/menu-button';

export const dynamic = 'force-dynamic';

function jobTitle(job: WizardJobRow, fallback: string): { company: string; role: string | null } {
	if (!job.result_json) return { company: fallback, role: null };
	try {
		const content = JSON.parse(job.result_json) as ProposedContent;
		return { company: content.company || fallback, role: content.role || null };
	} catch {
		return { company: fallback, role: null };
	}
}

export default async function TachesPage() {
	const locale = await getServerLocale();
	const t = getDict(locale);
	const jobs = listJobs();

	return (
		<div>
			<div className='topbar'>
				<MenuButton />
				<h1>{t.tasks.title}</h1>
			</div>
			<div className='content'>
				<div className='panel'>
					<div className='panel-body'>
						{jobs.length === 0 && <div className='panel-empty'>{t.tasks.empty}</div>}
						{jobs.map((job) => {
							const { company, role } = jobTitle(job, t.tasks.untitledOffer);
							const statusLabel = {
								analyzing: t.tasks.statusAnalyzing,
								ready: t.tasks.statusReady,
								generating: t.tasks.statusGenerating,
								done: t.tasks.statusDone,
								error: t.tasks.statusError,
							}[job.status];
							const href = job.status === 'done' && job.application_id
								? `/applications?open=${job.application_id}`
								: `/nouvelle?job=${job.id}`;
							const linkLabel = job.status === 'done' && job.application_id ? t.tasks.viewApplication : t.tasks.resume;

							return (
								<div className='relance-item' key={job.id}>
									<div className='who'>
										<b>{company}</b>
										<span>
											{role ? `${role} · ` : ''}
											{t.tasks.startedAt(formatDateTime(job.created_at, locale))}
										</span>
									</div>
									<span className={`stamp ${job.status}`}>{statusLabel}</span>
									<NextLink href={href} className='btn subtle'>
										{linkLabel}
									</NextLink>
								</div>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
