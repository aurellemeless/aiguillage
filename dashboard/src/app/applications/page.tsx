import { Suspense } from 'react';
import NextLink from 'next/link';
import { listApplicationsWithHistory } from '@/lib/db';
import CandidaturesBoard from '@/components/candidatures-board';
import { getDict } from '@/lib/i18n';
import { getServerLocale } from '@/lib/server-locale';

// This page reads a local SQLite file that changes at runtime — never prerender it statically.
export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
	const locale = await getServerLocale();
	const t = getDict(locale);
	const applications = listApplicationsWithHistory();

	return (
		<div>
			<div className='topbar'>
				<h1>{t.candidatures.title}</h1>
				<NextLink href='/nouvelle' className='btn' style={{ marginLeft: 'auto' }}>
					{t.common.newApplicationBtn}
				</NextLink>
			</div>
			<div className='content'>
				<Suspense fallback={null}>
					<CandidaturesBoard applications={applications} />
				</Suspense>
			</div>
		</div>
	);
}
