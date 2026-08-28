'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApplicationWithHistory } from '@/lib/db';
import { STATUSES } from '@/lib/types';
import { isFollowupDue } from '@/lib/followup';
import { daysSince, formatDate } from '@/lib/status';
import { dayPrefix, statusLabel } from '@/lib/i18n';
import { useLocale } from '@/lib/locale-context';
import StatusStamp from '@/components/status-stamp';
import ApplicationDrawer from '@/components/application-drawer';

const CLOSED_STATUSES = new Set(['Refusé', 'Sans réponse/Abandonné', 'Offre reçue']);

function normalize(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase();
}

export default function CandidaturesBoard({ applications }: { applications: ApplicationWithHistory[] }) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { locale, t } = useLocale();
	const [mode, setMode] = useState<'kanban' | 'table'>('kanban');
	const [openId, setOpenId] = useState<number | null>(null);
	const [items, setItems] = useState(applications);
	const [draggingId, setDraggingId] = useState<number | null>(null);
	const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
	const [query, setQuery] = useState('');

	useEffect(() => {
		setItems(applications);
	}, [applications]);

	useEffect(() => {
		const openParam = searchParams.get('open');
		if (openParam) setOpenId(Number(openParam));
		const q = searchParams.get('q');
		if (q) setQuery(q);
	}, [searchParams]);

	const filteredItems = useMemo(() => {
		const needle = normalize(query.trim());
		if (!needle) return items;
		return items.filter((a) => normalize(a.company).includes(needle) || normalize(a.role).includes(needle));
	}, [items, query]);

	function ageLabel(app: ApplicationWithHistory): string {
		if (app.status === 'Brouillon') return '—';
		if (CLOSED_STATUSES.has(app.status)) return formatDate(app.application_date, locale);
		return `${dayPrefix(locale)}+${daysSince(app.application_date)}`;
	}

	const selected = useMemo(() => items.find((a) => a.id === openId) ?? null, [items, openId]);

	const columns = useMemo(
		() => STATUSES.map((status) => ({ status, items: filteredItems.filter((a) => a.status === status) })),
		[filteredItems]
	);

	async function moveTo(applicationId: number, newStatus: string) {
		const app = items.find((a) => a.id === applicationId);
		if (!app || app.status === newStatus) return;
		setItems((prev) => prev.map((a) => (a.id === applicationId ? { ...a, status: newStatus } : a)));
		await fetch(`/api/applications/${applicationId}/status`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: newStatus }),
		});
		router.refresh();
	}

	function handleDrop(e: React.DragEvent, status: string) {
		e.preventDefault();
		setDragOverStatus(null);
		setDraggingId(null);
		const id = Number(e.dataTransfer.getData('text/plain'));
		if (id) moveTo(id, status);
	}

	return (
		<div>
			<div className='toolbar'>
				<div className='view-toggle'>
					<button className={mode === 'kanban' ? 'active' : ''} onClick={() => setMode('kanban')}>
						{t.candidatures.kanban}
					</button>
					<button className={mode === 'table' ? 'active' : ''} onClick={() => setMode('table')}>
						{t.candidatures.list}
					</button>
				</div>
				<div className='search' style={{ minWidth: 240 }}>
					⌕
					<input
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={t.common.search}
						style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, font: 'inherit' }}
					/>
				</div>
				<span className='note'>{t.candidatures.count(filteredItems.length)}</span>
				<a href='/api/applications/export' className='btn subtle'>
					{t.export.button}
				</a>
			</div>

			{mode === 'kanban' && (
				<div className='board'>
					{columns.map((col) => (
						<div
							className={`col ${dragOverStatus === col.status ? 'drag-over' : ''}`}
							key={col.status}
							onDragOver={(e) => {
								e.preventDefault();
								if (dragOverStatus !== col.status) setDragOverStatus(col.status);
							}}
							onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
							onDrop={(e) => handleDrop(e, col.status)}
						>
							<div className='col-head'>
								<h3>{statusLabel(col.status, locale)}</h3>
								<span className='col-count font-mono'>{col.items.length}</span>
							</div>
							{col.items.map((app) => (
								<button
									className={`card ${draggingId === app.id ? 'dragging' : ''}`}
									key={app.id}
									draggable
									onDragStart={(e) => {
										e.dataTransfer.setData('text/plain', String(app.id));
										e.dataTransfer.effectAllowed = 'move';
										setDraggingId(app.id);
									}}
									onDragEnd={() => {
										setDraggingId(null);
										setDragOverStatus(null);
									}}
									onClick={() => setOpenId(app.id)}
								>
									<span className='co'>{app.company}</span>
									<span className='role'>{app.role}</span>
									<div className='meta'>
										<StatusStamp status={app.status} />
										<span className='age font-mono'>{ageLabel(app)}</span>
									</div>
								</button>
							))}
						</div>
					))}
				</div>
			)}

			{mode === 'table' && (
				<div className='table-wrap'>
					<table>
						<thead>
							<tr>
								<th>{t.candidatures.colCompany}</th>
								<th>{t.candidatures.colRole}</th>
								<th>{t.candidatures.colAppliedOn}</th>
								<th>{t.candidatures.colStatus}</th>
								<th>{t.candidatures.colFollowUp}</th>
							</tr>
						</thead>
						<tbody>
							{filteredItems.map((app) => (
								<tr key={app.id} onClick={() => setOpenId(app.id)}>
									<td>
										<b>{app.company}</b>
									</td>
									<td>{app.role}</td>
									<td className='date'>{formatDate(app.application_date, locale)}</td>
									<td>
										<StatusStamp status={app.status} />
									</td>
									<td>
										{isFollowupDue(app.status, app.application_date, app.followup_delay_days) ? (
											<span className='stamp relance'>
												{dayPrefix(locale)}+{daysSince(app.application_date)}
											</span>
										) : (
											'—'
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			<ApplicationDrawer application={selected} onClose={() => setOpenId(null)} />
		</div>
	);
}
