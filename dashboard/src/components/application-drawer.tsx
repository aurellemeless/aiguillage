'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApplicationWithHistory } from '@/lib/db';
import { STATUSES } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/status';
import { statusLabel } from '@/lib/i18n';
import { useLocale } from '@/lib/locale-context';
import StatusStamp from '@/components/status-stamp';

type Tab = 'resume' | 'offer' | 'docs' | 'followup' | 'hist' | 'notes';

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
	const { locale, t } = useLocale();
	const [tab, setTab] = useState<Tab>('resume');
	const [pendingStatus, setPendingStatus] = useState(false);
	const [notes, setNotes] = useState(application?.notes ?? '');
	const [savedNotes, setSavedNotes] = useState(false);
	const [previewDoc, setPreviewDoc] = useState<'cv' | 'letter' | null>(null);
	const [previewHtml, setPreviewHtml] = useState<Partial<Record<'cv' | 'letter', string>>>({});
	const [previewLoading, setPreviewLoading] = useState<'cv' | 'letter' | null>(null);
	const [revealPending, setRevealPending] = useState<'cv' | 'letter' | null>(null);
	const [docError, setDocError] = useState<string | null>(null);

	const [followupNote, setFollowupNote] = useState('');
	const [followupPending, setFollowupPending] = useState(false);
	const [followupError, setFollowupError] = useState<string | null>(null);
	const [delayDays, setDelayDays] = useState(application?.followup_delay_days ?? 10);
	const [delaySaving, setDelaySaving] = useState(false);
	const [delaySaved, setDelaySaved] = useState(false);
	const [draftText, setDraftText] = useState<string | null>(null);
	const [draftLoading, setDraftLoading] = useState(false);
	const [draftCopied, setDraftCopied] = useState(false);

	useEffect(() => {
		setNotes(application?.notes ?? '');
		setTab('resume');
		setPreviewDoc(null);
		setPreviewHtml({});
		setDocError(null);
		setFollowupNote('');
		setFollowupError(null);
		setDelayDays(application?.followup_delay_days ?? 10);
		setDraftText(null);
	}, [application?.id]);

	async function togglePreview(doc: 'cv' | 'letter') {
		if (!application) return;
		if (previewDoc === doc) {
			setPreviewDoc(null);
			return;
		}
		setDocError(null);
		if (!previewHtml[doc]) {
			setPreviewLoading(doc);
			try {
				const res = await fetch(`/api/applications/${application.id}/preview?doc=${doc}`);
				const data = await res.json();
				if (!res.ok) throw new Error(data.error ?? t.drawer.previewFailed);
				setPreviewHtml((prev) => ({ ...prev, [doc]: data.html }));
			} catch (err) {
				setDocError(err instanceof Error ? err.message : String(err));
				setPreviewLoading(null);
				return;
			}
			setPreviewLoading(null);
		}
		setPreviewDoc(doc);
	}

	async function handleReveal(doc: 'cv' | 'letter') {
		if (!application) return;
		setRevealPending(doc);
		setDocError(null);
		try {
			const res = await fetch(`/api/applications/${application.id}/reveal`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ doc }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.drawer.revealFailed);
		} catch (err) {
			setDocError(err instanceof Error ? err.message : String(err));
		} finally {
			setRevealPending(null);
		}
	}

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

	async function handleMarkFollowedUp() {
		if (!application) return;
		setFollowupPending(true);
		setFollowupError(null);
		try {
			const res = await fetch(`/api/applications/${application.id}/followups`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ note: followupNote }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.drawer.followupMarkFailed);
			setFollowupNote('');
			router.refresh();
		} catch (err) {
			setFollowupError(err instanceof Error ? err.message : String(err));
		} finally {
			setFollowupPending(false);
		}
	}

	async function handleDelayBlur() {
		if (!application || delayDays === application.followup_delay_days) return;
		setDelaySaving(true);
		setFollowupError(null);
		try {
			const res = await fetch(`/api/applications/${application.id}/followup-delay`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ days: delayDays }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.drawer.followupDelayFailed);
			setDelaySaved(true);
			router.refresh();
			setTimeout(() => setDelaySaved(false), 1500);
		} catch (err) {
			setFollowupError(err instanceof Error ? err.message : String(err));
		} finally {
			setDelaySaving(false);
		}
	}

	async function handleGenerateDraft() {
		if (!application) return;
		setDraftLoading(true);
		setFollowupError(null);
		try {
			const res = await fetch(`/api/applications/${application.id}/followup-draft`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ language: locale }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.drawer.followupDraftFailed);
			setDraftText(data.text);
		} catch (err) {
			setFollowupError(err instanceof Error ? err.message : String(err));
		} finally {
			setDraftLoading(false);
		}
	}

	async function handleCopyDraft() {
		if (!draftText) return;
		await navigator.clipboard.writeText(draftText);
		setDraftCopied(true);
		setTimeout(() => setDraftCopied(false), 1500);
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
								<button className='drawer-close' onClick={onClose} aria-label={t.drawer.close}>
									✕
								</button>
							</div>
							<div className='tabs'>
								<button className={`tab ${tab === 'resume' ? 'active' : ''}`} onClick={() => setTab('resume')}>
									{t.drawer.tabResume}
								</button>
								<button className={`tab ${tab === 'offer' ? 'active' : ''}`} onClick={() => setTab('offer')}>
									{t.drawer.tabOffer}
								</button>
								<button className={`tab ${tab === 'docs' ? 'active' : ''}`} onClick={() => setTab('docs')}>
									{t.drawer.tabDocs}
								</button>
								<button className={`tab ${tab === 'followup' ? 'active' : ''}`} onClick={() => setTab('followup')}>
									{t.drawer.tabFollowup}
								</button>
								<button className={`tab ${tab === 'hist' ? 'active' : ''}`} onClick={() => setTab('hist')}>
									{t.drawer.tabHistory}
								</button>
								<button className={`tab ${tab === 'notes' ? 'active' : ''}`} onClick={() => setTab('notes')}>
									{t.drawer.tabNotes}
								</button>
							</div>
						</div>
						<div className='drawer-body'>
							{tab === 'resume' && (
								<div>
									<div className='kv'>
										<span className='k'>{t.drawer.status}</span>
										<span className='v'>
											<StatusStamp status={application.status} />
										</span>
										<span className='k'>{t.drawer.appliedOn}</span>
										<span className='v font-mono'>{formatDate(application.application_date, locale)}</span>
										<span className='k'>{t.drawer.nextFollowUp}</span>
										<span className='v font-mono'>{formatDate(application.next_followup_date, locale)}</span>
										<span className='k'>{t.drawer.source}</span>
										<span className='v'>{application.offer_source ?? t.common.none}</span>
										<span className='k'>{t.drawer.contact}</span>
										<span className='v'>{application.recruiter_contact ?? t.common.notProvided}</span>
									</div>
									<div className='field'>
										<label>{t.drawer.changeStatus}</label>
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
													{statusLabel(s, locale)}
												</option>
											))}
										</select>
									</div>
								</div>
							)}

							{tab === 'offer' && (
								<div>
									{application.offer_text ? (
										<div
											className='note-box'
											style={{ whiteSpace: 'pre-wrap', maxHeight: 420, overflowY: 'auto' }}
										>
											{application.offer_text}
										</div>
									) : (
										<div className='panel-empty'>{t.drawer.noOffer}</div>
									)}
								</div>
							)}

							{tab === 'docs' && (
								<div>
									{docError && <div className='error-box'>{docError}</div>}
									{(
										[
											{ key: 'cv' as const, path: application.cv_file_path },
											{ key: 'letter' as const, path: application.cover_letter_file_path },
										] as const
									).map(
										({ key, path }) =>
											path && (
												<div key={key} style={{ marginBottom: 14 }}>
													<div className='doc-link' style={{ marginBottom: 6 }}>
														<span className='ext'>DOCX</span>
														<span className='name'>{fileName(path)}</span>
													</div>
													<div style={{ display: 'flex', gap: 10 }}>
														<button
															type='button'
															className='btn subtle'
															onClick={() => togglePreview(key)}
															disabled={previewLoading === key}
														>
															{previewLoading === key ? '…' : previewDoc === key ? t.drawer.hidePreview : t.drawer.preview}
														</button>
														<button
															type='button'
															className='btn subtle'
															onClick={() => handleReveal(key)}
															disabled={revealPending === key}
														>
															{revealPending === key ? '…' : t.drawer.revealInFolder}
														</button>
													</div>
													{previewDoc === key && previewHtml[key] && (
														<div
															className='docx-preview'
															dangerouslySetInnerHTML={{ __html: previewHtml[key]! }}
														/>
													)}
												</div>
											)
									)}
									{!application.cv_file_path && !application.cover_letter_file_path && (
										<div className='panel-empty'>{t.drawer.noDocuments}</div>
									)}
									{application.cv_file_path && (
										<div className='note' style={{ marginTop: 2 }}>
											{t.drawer.localPathsHint}
										</div>
									)}
								</div>
							)}

							{tab === 'followup' && (
								<div>
									{followupError && <div className='error-box'>{followupError}</div>}

									<div className='field'>
										<label>{t.drawer.followupDelayLabel}</label>
										<input
											type='number'
											min={1}
											value={delayDays}
											onChange={(e) => setDelayDays(Number(e.target.value))}
											onBlur={handleDelayBlur}
											disabled={delaySaving}
											style={{
												maxWidth: 120,
												border: '1px solid var(--rule)',
												borderRadius: 5,
												padding: '9px 11px',
												background: 'var(--paper)',
												color: 'var(--ink)',
											}}
										/>
										{delaySaved && (
											<span className='note' style={{ marginLeft: 8, color: 'var(--green)' }}>
												{t.drawer.notesSaved}
											</span>
										)}
									</div>

									<div className='field'>
										<textarea
											rows={2}
											className='note-box'
											placeholder={t.drawer.followupNotePlaceholder}
											value={followupNote}
											onChange={(e) => setFollowupNote(e.target.value)}
										/>
									</div>
									<div className='wizard-actions' style={{ justifyContent: 'flex-start' }}>
										<button type='button' className='btn' onClick={handleMarkFollowedUp} disabled={followupPending}>
											{followupPending ? '…' : t.drawer.followupMarkDone}
										</button>
									</div>

									<h3 style={{ marginTop: 20 }}>{t.drawer.followupHistoryTitle}</h3>
									{application.followups.length === 0 ? (
										<div className='panel-empty'>{t.drawer.followupNone}</div>
									) : (
										<div className='timeline'>
											{application.followups.map((f) => (
												<div className='tl-item' key={f.id}>
													<div className='tl-dot' />
													<div>
														<div className='tl-date font-mono'>{formatDateTime(f.followed_up_at, locale)}</div>
														{f.note && <div className='tl-text'>{f.note}</div>}
													</div>
												</div>
											))}
										</div>
									)}

									<h3 style={{ marginTop: 20 }}>{t.drawer.followupDraftTitle}</h3>
									<div className='wizard-actions' style={{ justifyContent: 'flex-start' }}>
										<button type='button' className='btn subtle' onClick={handleGenerateDraft} disabled={draftLoading}>
											{draftLoading ? t.drawer.followupGeneratingDraft : t.drawer.followupGenerateDraft}
										</button>
									</div>
									{draftText && (
										<div style={{ marginTop: 10 }}>
											<textarea readOnly rows={8} className='note-box' value={draftText} />
											<div className='wizard-actions' style={{ justifyContent: 'flex-start', marginTop: 8 }}>
												<button type='button' className='btn subtle' onClick={handleCopyDraft}>
													{draftCopied ? t.drawer.followupCopied : t.drawer.followupCopy}
												</button>
											</div>
										</div>
									)}
								</div>
							)}

							{tab === 'hist' && (
								<div className='timeline'>
									{application.history.length === 0 && <div className='panel-empty'>{t.drawer.noHistory}</div>}
									{application.history.map((h) => (
										<div className='tl-item' key={h.id}>
											<div className='tl-dot' />
											<div>
												<div className='tl-date font-mono'>{formatDateTime(h.changed_at, locale)}</div>
												<div className='tl-text'>
													{t.drawer.statusArrow} <b>{statusLabel(h.status, locale)}</b>
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
										placeholder={t.drawer.notesPlaceholder}
										onChange={(e) => setNotes(e.target.value)}
										onBlur={handleNotesBlur}
									/>
									{savedNotes && (
										<div className='note' style={{ marginTop: 6, color: 'var(--green)' }}>
											{t.drawer.notesSaved}
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
