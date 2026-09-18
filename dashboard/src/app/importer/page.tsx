'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale-context';
import { STATUSES } from '@/lib/types';
import { statusLabel } from '@/lib/i18n';
import MenuButton from '@/components/menu-button';

interface ExtractResult {
	tempId: string;
	cvFileName: string;
	coverLetterFileName: string | null;
	company: string;
	role: string;
	offer_text: string | null;
	offer_source: string | null;
	application_date: string | null;
}

export default function ImporterPage() {
	const router = useRouter();
	const { locale, t } = useLocale();
	const cvInputRef = useRef<HTMLInputElement>(null);
	const letterInputRef = useRef<HTMLInputElement>(null);

	const [cvFile, setCvFile] = useState<File | null>(null);
	const [letterFile, setLetterFile] = useState<File | null>(null);
	const [contextText, setContextText] = useState('');
	const [extracting, setExtracting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [result, setResult] = useState<ExtractResult | null>(null);
	const [company, setCompany] = useState('');
	const [role, setRole] = useState('');
	const [applicationDate, setApplicationDate] = useState('');
	const [status, setStatus] = useState('sent');
	const [offerSource, setOfferSource] = useState('');
	const [offerText, setOfferText] = useState('');
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [savedId, setSavedId] = useState<number | null>(null);

	async function handleExtract() {
		if (!cvFile) return;
		setExtracting(true);
		setError(null);
		try {
			const formData = new FormData();
			formData.append('cv', cvFile);
			if (letterFile) formData.append('cover_letter', letterFile);
			formData.append('context', contextText);
			formData.append('language', locale);

			const res = await fetch('/api/applications/import', { method: 'POST', body: formData });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.importApp.extractFailed);

			setResult(data);
			setCompany(data.company ?? '');
			setRole(data.role ?? '');
			setApplicationDate(data.application_date ?? new Date().toISOString().slice(0, 10));
			setOfferSource(data.offer_source ?? '');
			setOfferText(data.offer_text ?? '');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setExtracting(false);
		}
	}

	async function handleSave() {
		if (!result) return;
		setSaving(true);
		setSaveError(null);
		try {
			const res = await fetch('/api/applications/import/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tempId: result.tempId,
					cvFileName: result.cvFileName,
					coverLetterFileName: result.coverLetterFileName,
					company,
					role,
					application_date: applicationDate,
					status,
					offer_source: offerSource,
					offer_text: offerText,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.importApp.saveFailed);
			setSavedId(data.applicationId);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	}

	function reset() {
		setCvFile(null);
		setLetterFile(null);
		setContextText('');
		setError(null);
		setResult(null);
		setSaveError(null);
		setSavedId(null);
		if (cvInputRef.current) cvInputRef.current.value = '';
		if (letterInputRef.current) letterInputRef.current.value = '';
	}

	if (savedId) {
		return (
			<div>
				<div className='topbar'>
					<MenuButton />
					<h1>{t.importApp.title}</h1>
				</div>
				<div className='content'>
					<div className='center-state' style={{ paddingBottom: 24 }}>
						<div className='done-icon'>✓</div>
						<div>
							<b>{t.importApp.saved}</b>
							<br />
							<span className='note'>{t.importApp.savedSub}</span>
						</div>
					</div>
					<div className='wizard-actions' style={{ justifyContent: 'center' }}>
						<button type='button' className='btn subtle' onClick={reset}>
							{t.importApp.importAnother}
						</button>
						<button type='button' className='btn' onClick={() => router.push(`/applications?open=${savedId}`)}>
							{t.importApp.viewInBoard}
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className='topbar'>
				<MenuButton />
				<h1>{t.importApp.title}</h1>
			</div>
			<div className='content'>
				<div style={{ maxWidth: 640 }}>
					<p className='note' style={{ marginBottom: 18 }}>
						{t.importApp.intro}
					</p>

					{error && <div className='error-box'>{error}</div>}

					{!result && (
						<>
							<div className='field'>
								<label>{t.importApp.cvLabel}</label>
								<input
									ref={cvInputRef}
									type='file'
									accept='.pdf,.docx'
									style={{ display: 'none' }}
									onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
								/>
								<div className='exp-row'>
									<button type='button' className='btn subtle' onClick={() => cvInputRef.current?.click()}>
										{t.importApp.chooseFile}
									</button>
									<span className='note'>{cvFile ? cvFile.name : t.importApp.cvHint}</span>
								</div>
							</div>

							<div className='field'>
								<label>{t.importApp.coverLetterLabel}</label>
								<input
									ref={letterInputRef}
									type='file'
									accept='.pdf,.docx'
									style={{ display: 'none' }}
									onChange={(e) => setLetterFile(e.target.files?.[0] ?? null)}
								/>
								<div className='exp-row'>
									<button type='button' className='btn subtle' onClick={() => letterInputRef.current?.click()}>
										{t.importApp.chooseFile}
									</button>
									{letterFile && <span className='note'>{letterFile.name}</span>}
								</div>
							</div>

							<div className='field'>
								<label>{t.importApp.contextLabel}</label>
								<textarea
									rows={8}
									placeholder={t.importApp.contextPlaceholder}
									value={contextText}
									onChange={(e) => setContextText(e.target.value)}
								/>
								<span className='note'>{t.importApp.contextHint}</span>
							</div>

							<div className='wizard-actions'>
								<button type='button' className='btn' onClick={handleExtract} disabled={!cvFile || extracting}>
									{extracting ? t.importApp.extracting : t.importApp.extract}
								</button>
							</div>
						</>
					)}

					{result && (
						<>
							<h2 style={{ fontSize: 16, marginBottom: 14 }}>{t.importApp.reviewTitle}</h2>
							{(!result.company || !result.role) && <div className='error-box'>{t.importApp.missingWarning}</div>}

							<div className='field-grid-2'>
								<div className='field'>
									<label>{t.importApp.company}</label>
									<input value={company} onChange={(e) => setCompany(e.target.value)} />
								</div>
								<div className='field'>
									<label>{t.importApp.role}</label>
									<input value={role} onChange={(e) => setRole(e.target.value)} />
								</div>
							</div>

							<div className='field-grid-2'>
								<div className='field'>
									<label>{t.importApp.applicationDate}</label>
									<input type='date' value={applicationDate} onChange={(e) => setApplicationDate(e.target.value)} />
								</div>
								<div className='field'>
									<label>{t.importApp.status}</label>
									<select
										value={status}
										onChange={(e) => setStatus(e.target.value)}
										style={{
											border: '1px solid var(--rule)',
											borderRadius: 5,
											padding: '9px 11px',
											background: 'var(--paper)',
											color: 'var(--ink)',
											fontFamily: 'inherit',
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

							<div className='field'>
								<label>{t.importApp.offerSource}</label>
								<input value={offerSource} onChange={(e) => setOfferSource(e.target.value)} />
							</div>

							<div className='field'>
								<label>{t.importApp.offerText}</label>
								<textarea rows={8} value={offerText} onChange={(e) => setOfferText(e.target.value)} />
							</div>

							<div className='field'>
								<label>{t.importApp.filesLabel}</label>
								<div className='note'>
									{result.cvFileName}
									{result.coverLetterFileName ? ` · ${result.coverLetterFileName}` : ''}
								</div>
							</div>

							{saveError && <div className='error-box'>{saveError}</div>}

							<div className='wizard-actions'>
								<button type='button' className='btn subtle' onClick={reset} disabled={saving}>
									{t.importApp.back}
								</button>
								<button
									type='button'
									className='btn'
									onClick={handleSave}
									disabled={saving || !company.trim() || !role.trim()}
								>
									{saving ? t.importApp.saving : t.importApp.save}
								</button>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
