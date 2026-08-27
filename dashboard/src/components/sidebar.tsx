'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { ColorModeButton } from '@/components/ui/color-mode';

const NAV_ITEMS = [
	{ href: '/', label: 'Tableau de bord', icon: '▣' },
	{ href: '/applications', label: 'Candidatures', icon: '▤' },
	{ href: '/nouvelle', label: 'Nouvelle candidature', icon: '✎' },
];

export default function Sidebar() {
	const pathname = usePathname();

	return (
		<aside
			style={{
				borderRight: '1px solid var(--rule)',
				background: 'var(--surface)',
				padding: '22px 18px',
				display: 'flex',
				flexDirection: 'column',
				gap: 28,
				width: 236,
				flex: '0 0 236px',
				minHeight: '100vh',
			}}
		>
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
					Suivi de candidatures
				</div>
				<div className='font-display' style={{ fontSize: 19, fontWeight: 600 }}>
					Aiguill<span style={{ color: 'var(--accent)' }}>age</span>
				</div>
			</div>

			<nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
				{NAV_ITEMS.map((item) => {
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

			<div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 14, borderTop: '1px solid var(--rule)' }}>
				<span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Registre local</span>
				<ColorModeButton />
			</div>
		</aside>
	);
}
