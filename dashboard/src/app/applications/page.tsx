import { Suspense } from 'react';
import NextLink from 'next/link';
import { listApplicationsWithHistory } from '@/lib/db';
import CandidaturesBoard from '@/components/candidatures-board';

// This page reads a local SQLite file that changes at runtime — never prerender it statically.
export const dynamic = 'force-dynamic';

export default function ApplicationsPage() {
	const applications = listApplicationsWithHistory();

	return (
		<div>
			<div className='topbar'>
				<h1>Candidatures</h1>
				<div className='search'>⌕ Rechercher une entreprise, un poste…</div>
				<NextLink href='/nouvelle' className='btn'>
					+ Nouvelle candidature
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
