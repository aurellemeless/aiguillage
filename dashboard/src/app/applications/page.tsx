import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import NextLink from 'next/link';
import { listApplicationsWithHistory } from '@/lib/db';
import CandidaturesBoard from '@/components/candidatures-board';
import { getDict } from '@/lib/i18n';
import { getServerLocale } from '@/lib/server-locale';
import { getServerProfileSlug } from '@/lib/server-profile';
import MenuButton from '@/components/menu-button';

// This page reads a local SQLite file that changes at runtime — never prerender it statically.
export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
	const locale = await getServerLocale();
	const t = getDict(locale);
	const profileSlug = await getServerProfileSlug();
	if (!profileSlug) redirect('/profil');
	const applications = listApplicationsWithHistory(profileSlug);

	return (
		<div>
			<div className='topbar'>
				<MenuButton />
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
