import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Provider } from '@/components/ui/provider';
import { LocaleProvider } from '@/lib/locale-context';
import { SidebarProvider } from '@/lib/sidebar-context';
import { ProfileProvider } from '@/lib/profile-context';
import { getServerLocale } from '@/lib/server-locale';
import { getServerProfileSlug } from '@/lib/server-profile';
import { listProfiles } from '@/lib/profiles';
import Sidebar from '@/components/sidebar';

const plexSans = IBM_Plex_Sans({
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
	variable: '--font-body',
});
const plexSerif = IBM_Plex_Serif({
	subsets: ['latin'],
	weight: ['500', '600'],
	variable: '--font-display',
});
const plexMono = IBM_Plex_Mono({
	subsets: ['latin'],
	weight: ['400', '500', '600'],
	variable: '--font-mono',
});

export async function generateMetadata(): Promise<Metadata> {
	const locale = await getServerLocale();
	return {
		title: 'Aiguillage',
		description:
			locale === 'en'
				? 'Aiguillage — generates a CV and cover letter tailored to a job posting, and tracks each application to its destination.'
				: 'Aiguillage — génère un CV et une lettre adaptés à une offre, et suit chaque candidature jusqu’à sa destination.',
	};
}

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getServerLocale();
	const profiles = listProfiles();
	const profileSlug = await getServerProfileSlug();

	return (
		<html
			lang={locale}
			className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`}
			suppressHydrationWarning
		>
			<body>
				<Provider>
					<LocaleProvider initialLocale={locale}>
						<ProfileProvider initialSlug={profileSlug} initialProfiles={profiles}>
							<SidebarProvider>
								<div className='app-shell'>
									<Sidebar />
									<div className='app-main'>{children}</div>
								</div>
							</SidebarProvider>
						</ProfileProvider>
					</LocaleProvider>
				</Provider>
			</body>
		</html>
	);
}
