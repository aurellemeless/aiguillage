import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { Provider } from '@/components/ui/provider';
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

export const metadata: Metadata = {
	title: 'Aiguillage',
	description:
		'Aiguillage — génère un CV et une lettre adaptés à une offre, et suit chaque candidature jusqu’à sa destination.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='fr' className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable}`} suppressHydrationWarning>
			<body>
				<Provider>
					<div style={{ display: 'flex', minHeight: '100vh' }}>
						<Sidebar />
						<div style={{ flex: 1, minWidth: 0 }}>{children}</div>
					</div>
				</Provider>
			</body>
		</html>
	);
}
