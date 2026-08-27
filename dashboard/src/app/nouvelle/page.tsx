'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewForm from '@/components/review-form';
import CvPreview from '@/components/cv-preview';
import CopyablePath from '@/components/copyable-path';
import { ProposedContent } from '@/lib/types';
import { useLocale } from '@/lib/locale-context';

type Step = 'offre' | 'analyse' | 'relecture' | 'generation' | 'termine';

export default function NouvelleCandidaturePage() {
	const router = useRouter();
	const { locale, t } = useLocale();
	const [step, setStep] = useState<Step>('offre');
	const [offerText, setOfferText] = useState('');
	const [content, setContent] = useState<ProposedContent | null>(null);
	const [generateLetter, setGenerateLetter] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<{ cvPath: string; coverLetterPath: string | null } | null>(null);

	const STEPS: { key: Step; label: string }[] = [
		{ key: 'offre', label: t.wizard.stepOffer },
		{ key: 'analyse', label: t.wizard.stepAnalysis },
		{ key: 'relecture', label: t.wizard.stepReview },
		{ key: 'generation', label: t.wizard.stepGeneration },
		{ key: 'termine', label: t.wizard.stepDone },
	];
	const currentIndex = STEPS.findIndex((s) => s.key === step);

	async function handleAnalyze() {
		setError(null);
		setStep('analyse');
		try {
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ offerText, language: locale }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.wizard.analyzeFailed);
			setContent(data as ProposedContent);
			setStep('relecture');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setStep('offre');
		}
	}

	async function handleGenerate() {
		if (!content) return;
		setError(null);
		setStep('generation');
		try {
			const res = await fetch('/api/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					company: content.company,
					role: content.role,
					cv: content.cv,
					coverLetter: generateLetter ? content.cover_letter : undefined,
					language: locale,
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.wizard.generateFailed);
			setResult({ cvPath: data.cvPath, coverLetterPath: data.coverLetterPath });
			setStep('termine');
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setStep('relecture');
		}
	}

	function reset() {
		setStep('offre');
		setOfferText('');
		setContent(null);
		setGenerateLetter(true);
		setResult(null);
		setError(null);
	}

	return (
		<div>
			<div className='topbar'>
				<h1>{t.wizard.title}</h1>
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

				{step === 'offre' && (
					<div style={{ maxWidth: 640 }}>
						<div className='field'>
							<label>{t.wizard.offerLabel}</label>
							<textarea
								rows={14}
								placeholder={t.wizard.offerPlaceholder}
								value={offerText}
								onChange={(e) => setOfferText(e.target.value)}
							/>
						</div>
						<div className='wizard-actions'>
							<button className='btn' onClick={handleAnalyze} disabled={!offerText.trim()}>
								{t.wizard.analyze}
							</button>
						</div>
					</div>
				)}

				{step === 'analyse' && (
					<div className='center-state'>
						<div className='scanline' />
						<div>{t.wizard.analyzing}</div>
					</div>
				)}

				{step === 'relecture' && content && (
					<div className='wizard-grid'>
						<div>
							<ReviewForm
								content={content}
								onChange={setContent}
								generateCoverLetter={generateLetter}
								onToggleGenerateCoverLetter={setGenerateLetter}
							/>
						</div>
						<div style={{ position: 'sticky', top: 90 }}>
							<CvPreview content={content} />
						</div>
					</div>
				)}
				{step === 'relecture' && content && (
					<div className='wizard-actions'>
						<button className='btn subtle' onClick={() => setStep('offre')}>
							{t.wizard.back}
						</button>
						<button className='btn' onClick={handleGenerate}>
							{t.wizard.approveAndGenerate}
						</button>
					</div>
				)}

				{step === 'generation' && (
					<div className='center-state'>
						<div className='scanline' />
						<div>{t.wizard.generating}</div>
					</div>
				)}

				{step === 'termine' && result && (
					<div>
						<div className='center-state' style={{ paddingBottom: 24 }}>
							<div className='done-icon'>✓</div>
							<div>
								<b>{t.wizard.saved}</b>
								<br />
								<span className='note'>{t.wizard.savedSub}</span>
							</div>
						</div>
						<div style={{ maxWidth: 480, margin: '0 auto' }}>
							<div className='field'>
								<label>{t.wizard.cvLabel}</label>
								<CopyablePath label={t.wizard.cvLabel} path={result.cvPath} />
							</div>
							{result.coverLetterPath && (
								<div className='field'>
									<label>{t.wizard.letterLabel}</label>
									<CopyablePath label={t.wizard.letterLabel} path={result.coverLetterPath} />
								</div>
							)}
						</div>
						<div className='wizard-actions' style={{ justifyContent: 'center' }}>
							<button className='btn subtle' onClick={reset}>
								{t.wizard.newApplication}
							</button>
							<button className='btn' onClick={() => router.push('/applications')}>
								{t.wizard.viewInBoard}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
