'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale-context';
import { useProfile } from '@/lib/profile-context';
import { relativeTime } from '@/lib/status';
import { parseFitDetails } from '@/lib/fit';
import type { DiscoveredOffer, OfferStatus, ProfileSearchSettings } from '@/lib/db';
import FitCard, { FitBadge } from '@/components/fit-card';
import MenuButton from '@/components/menu-button';

const STATUSES: OfferStatus[] = ['new', 'dismissed', 'applied'];
const SCAN_POLL_INTERVAL_MS = 3000;

type SortKey = 'score' | 'date';

export default function DecouvertePage() {
	const router = useRouter();
	const { locale, t } = useLocale();
	const { profileSlug } = useProfile();

	const [status, setStatus] = useState<OfferStatus>('new');
	const [offersByStatus, setOffersByStatus] = useState<Partial<Record<OfferStatus, DiscoveredOffer[]>>>({});
	const [sort, setSort] = useState<SortKey>('score');
	const [expandedId, setExpandedId] = useState<number | null>(null);
	const [settings, setSettings] = useState<ProfileSearchSettings | null>(null);
	const [scanning, setScanning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [applyingId, setApplyingId] = useState<number | null>(null);

	const loadOffers = useCallback(
		async (s: OfferStatus) => {
			if (!profileSlug) return;
			const res = await fetch(`/api/profiles/${profileSlug}/offers?status=${s}`);
			const data = await res.json();
			if (res.ok) setOffersByStatus((prev) => ({ ...prev, [s]: data.offers }));
		},
		[profileSlug]
	);

	const loadSettings = useCallback(async () => {
		if (!profileSlug) return null;
		const res = await fetch(`/api/profiles/${profileSlug}/search-settings`);
		const data = await res.json();
		if (res.ok) {
			setSettings(data.settings);
			return data.settings as ProfileSearchSettings;
		}
		return null;
	}, [profileSlug]);

	useEffect(() => {
		if (!profileSlug) return;
		STATUSES.forEach((s) => loadOffers(s));
		loadSettings();
	}, [profileSlug, loadOffers, loadSettings]);

	// While a scan is in flight (triggered here, or left running from a
	// previous visit), poll until it settles, then refresh the offer lists.
	useEffect(() => {
		if (!profileSlug) return;
		let cancelled = false;
		let interval: ReturnType<typeof setInterval> | null = null;

		async function tick() {
			const s = await loadSettings();
			if (cancelled) return;
			if (s?.last_scan_status === 'scanning') {
				setScanning(true);
			} else {
				setScanning(false);
				if (interval) clearInterval(interval);
				STATUSES.forEach((st) => loadOffers(st));
			}
		}

		loadSettings().then((s) => {
			if (s?.last_scan_status === 'scanning') {
				setScanning(true);
				interval = setInterval(tick, SCAN_POLL_INTERVAL_MS);
			}
		});

		return () => {
			cancelled = true;
			if (interval) clearInterval(interval);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [profileSlug]);

	async function handleScan() {
		if (!profileSlug || scanning) return;
		setError(null);
		if (!settings?.keywords.length) {
			setError(t.decouverte.noKeywordsWarning);
			return;
		}
		setScanning(true);
		await fetch(`/api/profiles/${profileSlug}/scan`, { method: 'POST' });
		const interval = setInterval(async () => {
			const s = await loadSettings();
			if (s?.last_scan_status !== 'scanning') {
				clearInterval(interval);
				setScanning(false);
				if (s?.last_scan_status === 'error' && s.last_scan_error) setError(s.last_scan_error);
				STATUSES.forEach((st) => loadOffers(st));
			}
		}, SCAN_POLL_INTERVAL_MS);
	}

	async function handleSetStatus(offer: DiscoveredOffer, next: OfferStatus) {
		if (!profileSlug) return;
		await fetch(`/api/profiles/${profileSlug}/offers/${offer.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: next }),
		});
		loadOffers('new');
		loadOffers('dismissed');
	}

	async function handleApply(offer: DiscoveredOffer) {
		if (!profileSlug) return;
		setApplyingId(offer.id);
		setError(null);
		try {
			const res = await fetch(`/api/profiles/${profileSlug}/offers/${offer.id}/apply`, { method: 'POST' });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.decouverte.applyFailed);
			router.push(`/nouvelle?job=${data.jobId}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setApplyingId(null);
		}
	}

	const sorted = useMemo(() => {
		const copy = [...(offersByStatus[status] ?? [])];
		if (sort === 'score') copy.sort((a, b) => b.fit_score - a.fit_score);
		else copy.sort((a, b) => (b.posted_date ?? '').localeCompare(a.posted_date ?? ''));
		return copy;
	}, [offersByStatus, status, sort]);

	const counts = {
		new: offersByStatus.new?.length ?? 0,
		dismissed: offersByStatus.dismissed?.length ?? 0,
		applied: offersByStatus.applied?.length ?? 0,
	};

	const emptyLabel = { new: t.decouverte.noOffersNew, dismissed: t.decouverte.noOffersDismissed, applied: t.decouverte.noOffersApplied }[
		status
	];

	return (
		<div>
			<div className='topbar'>
				<MenuButton />
				<h1>{t.decouverte.title}</h1>
				<span className='note' style={{ marginLeft: 8 }}>
					{settings?.last_scan_at
						? t.decouverte.lastScan(relativeTime(settings.last_scan_at, locale), settings.last_scan_new ?? 0)
						: t.decouverte.neverScanned}
				</span>
				<button className='btn' style={{ marginLeft: 'auto' }} onClick={handleScan} disabled={scanning}>
					{scanning ? t.decouverte.scanning : `⟳ ${t.decouverte.scanNow}`}
				</button>
			</div>
			<div className='content'>
				{error && <div className='error-box'>{error}</div>}
				{settings && !settings.sources.length && <div className='note' style={{ marginBottom: 14 }}>{t.decouverte.notConfiguredWarning}</div>}

				<div className='toolbar'>
					<div className='view-toggle'>
						{STATUSES.map((s) => (
							<button
								key={s}
								className={status === s ? 'active' : ''}
								onClick={() => {
									setStatus(s);
									setExpandedId(null);
								}}
							>
								{{ new: t.decouverte.statusNew, dismissed: t.decouverte.statusDismissed, applied: t.decouverte.statusApplied }[s](
									counts[s]
								)}
							</button>
						))}
					</div>
					<select
						value={sort}
						onChange={(e) => setSort(e.target.value as SortKey)}
						style={{
							marginLeft: 'auto',
							border: '1px solid var(--rule)',
							borderRadius: 5,
							padding: '7px 11px',
							background: 'var(--surface)',
							color: 'var(--ink)',
							fontSize: 13,
							fontFamily: 'inherit',
						}}
					>
						<option value='score'>{t.decouverte.sortByScore}</option>
						<option value='date'>{t.decouverte.sortByDate}</option>
					</select>
				</div>

				{sorted.length === 0 && <div className='panel-empty'>{emptyLabel}</div>}

				<div className='offer-list'>
					{sorted.map((offer) => {
						const open = expandedId === offer.id;
						const fitDetails = parseFitDetails(offer.fit_json);
						return (
							<div className='offer-row' key={offer.id}>
								<div className='offer-row-main'>
									<div className='who'>
										<div className='co'>{offer.company ?? offer.title}</div>
										<div className='role'>{offer.title}</div>
										<div className='offer-meta'>
											<span className='source-tag'>{offer.source === 'france_travail' ? 'France Travail' : offer.source}</span>
											{offer.location && <span className='offer-loc'>{offer.location}</span>}
											{offer.posted_date && <span className='offer-date'>{relativeTime(offer.posted_date, locale)}</span>}
										</div>
									</div>
									<FitBadge score={offer.fit_score} decision={offer.fit_decision} />
									<div className='offer-actions'>
										<button className='btn subtle' onClick={() => setExpandedId(open ? null : offer.id)}>
											{open ? t.decouverte.hideDetails : t.decouverte.details}
										</button>
										{status === 'new' && (
											<button className='btn danger-ghost' onClick={() => handleSetStatus(offer, 'dismissed')}>
												{t.decouverte.dismiss}
											</button>
										)}
										{status === 'dismissed' && (
											<button className='btn subtle' onClick={() => handleSetStatus(offer, 'new')}>
												{t.decouverte.restore}
											</button>
										)}
									</div>
								</div>
								{open && (
									<div className='offer-detail'>
										{fitDetails && (
											<FitCard
												score={offer.fit_score}
												decision={offer.fit_decision}
												categories={fitDetails.categories}
												reasons={fitDetails.reasons}
												t={t}
											/>
										)}
										<div className='offer-detail-actions'>
											{offer.url && (
												<a className='btn subtle' href={offer.url} target='_blank' rel='noreferrer'>
													{t.decouverte.viewSource}
												</a>
											)}
											{status !== 'applied' && (
												<button className='btn' onClick={() => handleApply(offer)} disabled={applyingId === offer.id}>
													{applyingId === offer.id ? '…' : t.decouverte.generateAndApply}
												</button>
											)}
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
