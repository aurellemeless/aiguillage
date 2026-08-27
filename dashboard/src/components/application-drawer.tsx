'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApplicationWithHistory } from '@/lib/db';
import { STATUSES } from '@/lib/types';
import { formatDateFr, formatDateTimeFr } from '@/lib/status';
import StatusStamp from '@/components/status-stamp';

type Tab = 'resume' | 'docs' | 'hist' | 'notes';

function fileName(path: string): string {
	return path.split('/').pop() ?? path;
}

export default function ApplicationDrawer({
	application,
	onClose,
}: {
	application: ApplicationWithHistory | null;
	onClose: () => void;
}) {
	const router = useRouter();
	const [tab, setTab] = useState<Tab>('resume');
	const [pendingStatus, setPendingStatus] = useState(false);
	const [notes, setNotes] = useState(application?.notes ?? '');
	const [savedNotes, setSavedNotes] = useState(false);

	useEffect(() => {
		setNotes(application?.notes ?? '');
		setTab('resume');
	}, [application?.id]);

	async function handleStatusChange(newStatus: string) {
		if (!application) return;
		setPendingStatus(true);
		await fetch(`/api/applications/${application.id}/status`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: newStatus }),
		});
		setPendingStatus(false);
		router.refresh();
	}

	async function handleNotesBlur() {
		if (!application) return;
		await fetch(`/api/applications/${application.id}/notes`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ notes }),
		});
		setSavedNotes(true);
		router.refresh();
		setTimeout(() => setSavedNotes(false), 1500);
	}

	const show = !!application;

	return (
		<>
			<div className={`overlay ${show ? 'show' : ''}`} onClick={onClose} />
			<aside className={`drawer ${show ? 'show' : ''}`} aria-hidden={!show}>
				{application && (
					<>
						<div className='drawer-head'>
							<div className='top'>
								<div>
									<h2>{application.company}</h2>
									<div className='role'>{application.role}</div>
								</div>
								<button className='drawer-close' onClick={onClose} aria-label='Fermer'>
									✕
								</button>
							</div>
							<div className='tabs'>
								<button className={`tab ${tab === 'resume' ? 'active' : ''}`} onClick={() => setTab('resume')}>
									Résumé
								</button>
								<button className={`tab ${tab === 'docs' ? 'active' : ''}`} onClick={() => setTab('docs')}>
									CV &amp; Lettre
								</button>
								<button className={`tab ${tab === 'hist' ? 'active' : ''}`} onClick={() => setTab('hist')}>
									Historique
								</button>
								<button className={`tab ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')}>
									Notes
								</button>
							</div>
						</div>
						<div className='drawer-body'>
							{tab === 'resume' && (
								<div>
									<div className='kv'>
										<span className='k'>Statut</span>
										<span className='v'>
											<StatusStamp status={application.status} />
										</span>
										<span className='k'>Candidaté le</span>
										<span className='v font-mono'>{formatDateFr(application.application_date)}</span>
										<span className='k'>Prochaine relance</span>
										<span className='v font-mono'>{formatDateFr(application.next_followup_date)}</span>
										<span className='k'>Source</span>
										<span className='v'>{application.offer_source ?? '—'}</span>
										<span className='k'>Contact</span>
										<span className='v'>{application.recruiter_contact ?? '— non renseigné —'}</span>
									</div>
									<div className='field'>
										<label>Changer le statut</label>
										<select
											value={application.status}
											disabled={pendingStatus}
											onChange={(e) => handleStatusChange(e.target.value)}
											style={{
												border: '1px solid var(--rule)',
												borderRadius: 5,
												padding: '9px 11px',
												background: 'var(--paper)',
												color: 'var(--ink)',
											}}
										>
											{STATUSES.map((s) => (
												<option key={s} value={s}>
													{s}
												</option>
											))}
										</select>
									</div>
								</div>
							)}

							{tab === 'docs' && (
								<div>
									{application.cv_file_path && (
										<div className='doc-link'>
											<span className='ext'>DOCX</span>
											<span className='name'>{fileName(application.cv_file_path)}</span>
										</div>
									)}
									{application.cover_letter_file_path && (
										<div className='doc-link'>
											<span className='ext'>DOCX</span>
											<span className='name'>{fileName(application.cover_letter_file_path)}</span>
										</div>
									)}
									{!application.cv_file_path && !application.cover_letter_file_path && (
										<div className='panel-empty'>Aucun document généré pour cette candidature.</div>
									)}
									{application.cv_file_path && (
										<div className='note' style={{ marginTop: 2 }}>
											Chemins locaux — ouvre-les depuis le Finder ou ton éditeur.
										</div>
									)}
								</div>
							)}

							{tab === 'hist' && (
								<div className='timeline'>
									{application.history.length === 0 && <div className='panel-empty'>Aucun historique.</div>}
									{application.history.map((h) => (
										<div className='tl-item' key={h.id}>
											<div className='tl-dot' />
											<div>
												<div className='tl-date font-mono'>{formatDateTimeFr(h.changed_at)}</div>
												<div className='tl-text'>
													Statut → <b>{h.status}</b>
												</div>
											</div>
										</div>
									))}
								</div>
							)}

							{tab === 'notes' && (
								<div>
									<textarea
										id='drawer-notes'
										className='note-box'
										rows={6}
										value={notes}
										placeholder='Ajouter une note (contact, préparation d’entretien, points à retenir…)'
										onChange={(e) => setNotes(e.target.value)}
										onBlur={handleNotesBlur}
									/>
									{savedNotes && (
										<div className='note' style={{ marginTop: 6, color: 'var(--green)' }}>
											Enregistré.
										</div>
									)}
								</div>
							)}
						</div>
					</>
				)}
			</aside>
		</>
	);
}
