'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from '@/lib/locale-context';

type Step = 'upload' | 'analyse' | 'relecture' | 'termine';

function tryParseIdentity(json: string): { name?: string; title?: string } | null {
	try {
		const parsed = JSON.parse(json);
		return parsed?.identity ?? {};
	} catch {
		return null;
	}
}

export default function ProfilePage() {
	const router = useRouter();
	const { locale, t } = useLocale();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [step, setStep] = useState<Step>('upload');
	const [file, setFile] = useState<File | null>(null);
	const [profileText, setProfileText] = useState('');
	const [jsonError, setJsonError] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [existingProfile, setExistingProfile] = useState(false);

	const STEPS: { key: Step; label: string }[] = [
		{ key: 'upload', label: t.profile.stepUpload },
		{ key: 'analyse', label: t.profile.stepAnalysis },
		{ key: 'relecture', label: t.profile.stepReview },
		{ key: 'termine', label: t.profile.stepDone },
	];
	const currentIndex = STEPS.findIndex((s) => s.key === step);

	async function handleAnalyze() {
		if (!file) {
			setError(t.profile.noFileError);
			return;
		}
		setError(null);
		setStep('analyse');
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('language', locale);
			const res = await fetch('/api/profile/extract', { method: 'POST', body: formData });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.profile.extractFailed);

			const checkRes = await fetch('/api/profile');
			const checkData = await checkRes.json();
			setExistingProfile(Boolean(checkData.exists));

			setProfileText(JSON.stringify(data.profile, null, 2));
			setJsonError(null);
			setStep('relecture');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setStep('upload');
		}
	}

	async function handleSave() {
		let parsed: unknown;
		try {
			parsed = JSON.parse(profileText);
		} catch {
			setJsonError(t.profile.invalidJson);
			return;
		}
		setJsonError(null);
		setError(null);
		try {
			const res = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(parsed),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.profile.saveFailed);
			setStep('termine');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		}
	}

	function reset() {
		setStep('upload');
		setFile(null);
		setProfileText('');
		setJsonError(null);
		setError(null);
		if (fileInputRef.current) fileInputRef.current.value = '';
	}

	const identity = step === 'relecture' ? tryParseIdentity(profileText) : null;

	return (
		<div>
			<div className='topbar'>
				<h1>{t.profile.title}</h1>
			</div>
			<div className='content'>
				<div className='stepper'>
					{STEPS.map((s, i) => (
						<div key={s.key} style={{ display: 'contents' }}>
							<div className={`step ${i < currentIndex ? 'done' : i === currentIndex ? 'active' : ''}`}>
								<span className='num'>{i < currentIndex ? '✓' : i + 1}</span>
								<span className='lbl'>{s.label}</span>
							</div>
							{i < STEPS.length - 1 && <div className={`step-line ${i < currentIndex ? 'done' : ''}`} />}
						</div>
					))}
				</div>
				{error && <div className='error-box'>{error}</div>}

				{step === 'upload' && (
					<div style={{ maxWidth: 560 }}>
						<p className='note' style={{ marginBottom: 18 }}>
							{t.profile.intro}
						</p>
						<div className='field'>
							<label>{t.profile.uploadLabel}</label>
							<input
								ref={fileInputRef}
								type='file'
								accept='.pdf,.docx'
								onChange={(e) => setFile(e.target.files?.[0] ?? null)}
								style={{ display: 'none' }}
							/>
							<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
								<button type='button' className='btn subtle' onClick={() => fileInputRef.current?.click()}>
									{t.profile.chooseFile}
								</button>
								<span className='note'>{file ? file.name : t.profile.noFileChosen}</span>
							</div>
							<p className='note' style={{ marginTop: 8 }}>
								{t.profile.fileTypeHint}
							</p>
						</div>
						<p className='note'>{t.profile.existingProfileHint}</p>
						<div className='wizard-actions'>
							<button className='btn' onClick={handleAnalyze} disabled={!file}>
								{t.profile.analyze}
							</button>
						</div>
					</div>
				)}

				{step === 'analyse' && (
					<div className='center-state'>
						<div className='scanline' />
						<div>{t.profile.analyzing}</div>
					</div>
				)}

				{step === 'relecture' && (
					<div style={{ maxWidth: 760 }}>
						{identity && (identity.name || identity.title) && (
							<div className='panel' style={{ padding: '14px 18px', marginBottom: 16 }}>
								<b>{identity.name}</b>
								{identity.title ? ` — ${identity.title}` : ''}
							</div>
						)}
						{existingProfile && <p className='note' style={{ marginBottom: 12 }}>{t.profile.existingProfileHint}</p>}
						<p className='note' style={{ marginBottom: 8 }}>
							{t.profile.reviewHint}
						</p>
						<div className='field'>
							<textarea
								className='font-mono'
								rows={22}
								value={profileText}
								onChange={(e) => {
									setProfileText(e.target.value);
									setJsonError(null);
								}}
								style={{ fontSize: 12.5 }}
							/>
						</div>
						{jsonError && <div className='error-box'>{jsonError}</div>}
						<div className='wizard-actions'>
							<button className='btn subtle' onClick={() => setStep('upload')}>
								{t.profile.back}
							</button>
							<button className='btn' onClick={handleSave}>
								{t.profile.save}
							</button>
						</div>
					</div>
				)}

				{step === 'termine' && (
					<div>
						<div className='center-state' style={{ paddingBottom: 24 }}>
							<div className='done-icon'>✓</div>
							<div>
								<b>{t.profile.saved}</b>
								<br />
								<span className='note'>{t.profile.savedSub}</span>
							</div>
						</div>
						<div className='wizard-actions' style={{ justifyContent: 'center' }}>
							<button className='btn subtle' onClick={reset}>
								{t.profile.importAnother}
							</button>
							<button className='btn' onClick={() => router.push('/')}>
								{t.profile.backToDashboard}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
