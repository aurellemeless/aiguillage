'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { ColorModeButton } from '@/components/ui/color-mode';
import { useLocale } from '@/lib/locale-context';
import { useSidebar } from '@/lib/sidebar-context';
import { Locale } from '@/lib/i18n';

export default function Sidebar() {
	const pathname = usePathname();
	const { locale, t, setLocale } = useLocale();
	const { open, setOpen } = useSidebar();

	const navItems = [
		{ href: '/', label: t.nav.dashboard, icon: '▣' },
		{ href: '/applications', label: t.nav.applications, icon: '▤' },
		{ href: '/nouvelle', label: t.nav.newApplication, icon: '✎' },
		{ href: '/profil', label: t.nav.profile, icon: '⚙' },
	];

	return (
		<>
			<div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
			<aside className={`sidebar ${open ? 'open' : ''}`}>
				<div>
					<div
						className='font-mono'
						style={{
							fontSize: 11,
							letterSpacing: '.14em',
							color: 'var(--ink-faint)',
							textTransform: 'uppercase',
						}}
					>
						{t.nav.tagline}
					</div>
					<div className='font-display' style={{ fontSize: 19, fontWeight: 600 }}>
						Aiguill<span style={{ color: 'var(--accent)' }}>age</span>
					</div>
				</div>

				<nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
					{navItems.map((item) => {
						const active = pathname === item.href;
						return (
							<NextLink
								key={item.href}
								href={item.href}
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 10,
									padding: '9px 10px',
									borderRadius: 4,
									fontSize: 13.5,
									fontWeight: active ? 600 : 500,
									color: active ? 'var(--accent)' : 'var(--ink-soft)',
									background: active ? 'var(--accent-soft)' : 'transparent',
									textDecoration: 'none',
								}}
							>
								<span className='font-mono' style={{ width: 16, textAlign: 'center', opacity: 0.85, fontSize: 13 }}>
									{item.icon}
								</span>
								{item.label}
							</NextLink>
						);
					})}
				</nav>

				<div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 14, borderTop: '1px solid var(--rule)' }}>
					<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
						<span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{t.nav.localRegistry}</span>
						<ColorModeButton />
					</div>
					<div className='view-toggle' style={{ alignSelf: 'flex-start' }}>
						{(['fr', 'en'] as Locale[]).map((l) => (
							<button key={l} className={locale === l ? 'active' : ''} onClick={() => setLocale(l)}>
								{l.toUpperCase()}
							</button>
						))}
					</div>
				</div>
			</aside>
		</>
	);
}
