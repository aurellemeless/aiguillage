'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { ColorModeButton } from '@/components/ui/color-mode';
import { useLocale } from '@/lib/locale-context';
import { useSidebar } from '@/lib/sidebar-context';
import { useProfile } from '@/lib/profile-context';
import { Locale } from '@/lib/i18n';
import type { WizardJobRow } from '@/lib/db';

const ACTIVE_JOB_STATUSES = new Set(['analyzing', 'generating']);
const TASKS_POLL_INTERVAL_MS = 8000;

export default function Sidebar() {
	const pathname = usePathname();
	const { locale, t, setLocale } = useLocale();
	const { open, setOpen } = useSidebar();
	const { profileSlug, profiles, setProfileSlug } = useProfile();
	const [activeTaskCount, setActiveTaskCount] = useState(0);

	useEffect(() => {
		let cancelled = false;
		async function poll() {
			try {
				const res = await fetch('/api/jobs');
				const data = await res.json();
				if (!cancelled) {
					const jobs = (data.jobs ?? []) as WizardJobRow[];
					setActiveTaskCount(jobs.filter((job) => ACTIVE_JOB_STATUSES.has(job.status)).length);
				}
			} catch {
				// ignore transient polling errors
			}
		}
		poll();
		const interval = setInterval(poll, TASKS_POLL_INTERVAL_MS);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, []);

	const navItems = [
		{ href: '/', label: t.nav.dashboard, icon: '▣', badge: 0 },
		{ href: '/applications', label: t.nav.applications, icon: '▤', badge: 0 },
		{ href: '/nouvelle', label: t.nav.newApplication, icon: '✎', badge: 0 },
		{ href: '/taches', label: t.nav.tasks, icon: '⧗', badge: activeTaskCount },
		{ href: '/profil', label: t.nav.profile, icon: '⚙', badge: 0 },
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

				{profiles.length > 0 && (
					<select
						value={profileSlug ?? ''}
						onChange={(e) => setProfileSlug(e.target.value)}
						style={{
							border: '1px solid var(--rule)',
							borderRadius: 5,
							padding: '7px 9px',
							background: 'var(--surface)',
							color: 'var(--ink)',
							fontSize: 13,
							fontFamily: 'inherit',
						}}
					>
						{profiles.map((p) => (
							<option key={p.slug} value={p.slug}>
								{p.label}
							</option>
						))}
					</select>
				)}

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
								{!!item.badge && (
									<span
										className='font-mono'
										style={{
											marginLeft: 'auto',
											background: 'var(--accent)',
											color: 'var(--accent-ink)',
											borderRadius: 10,
											fontSize: 11,
											fontWeight: 700,
											padding: '1px 7px',
										}}
									>
										{item.badge}
									</span>
								)}
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
