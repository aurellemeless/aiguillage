'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ReviewForm from '@/components/review-form';
import CvPreview from '@/components/cv-preview';
import CopyablePath from '@/components/copyable-path';
import { ProposedContent } from '@/lib/types';
import { Locale, parseLocale } from '@/lib/i18n';
import { useLocale } from '@/lib/locale-context';
import type { WizardJobRow } from '@/lib/db';
import { useJobPolling } from '@/lib/use-job-polling';
import MenuButton from '@/components/menu-button';

type Step = 'offre' | 'analyse' | 'relecture' | 'generation' | 'termine';

interface GenerateResult {
	cvPath: string;
	coverLetterPath: string | null;
	secondaryCvPath?: string;
	secondaryCoverLetterPath?: string | null;
}

const PATCH_DEBOUNCE_MS = 800;

export default function NouvelleCandidaturePage() {
	return (
		<Suspense fallback={null}>
			<NouvelleCandidatureInner />
		</Suspense>
	);
}

function NouvelleCandidatureInner() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { locale, t } = useLocale();

	const [jobId, setJobId] = useState<number | null>(null);
	const [step, setStep] = useState<Step>('offre');
	const [offerText, setOfferText] = useState('');
	const [content, setContent] = useState<ProposedContent | null>(null);
	const [contentLocale, setContentLocale] = useState<Locale>(locale);
	const [alsoOtherLanguage, setAlsoOtherLanguage] = useState(false);
	const [generateLetter, setGenerateLetter] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<GenerateResult | null>(null);

	const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const otherLocale: Locale = contentLocale === 'en' ? 'fr' : 'en';
	const langLabel = (l: Locale) => (l === 'en' ? t.reviewForm.langEn : t.reviewForm.langFr);

	const STEPS: { key: Step; label: string }[] = [
		{ key: 'offre', label: t.wizard.stepOffer },
		{ key: 'analyse', label: t.wizard.stepAnalysis },
		{ key: 'relecture', label: t.wizard.stepReview },
		{ key: 'generation', label: t.wizard.stepGeneration },
		{ key: 'termine', label: t.wizard.stepDone },
	];
	const currentIndex = STEPS.findIndex((s) => s.key === step);

	function applyJob(job: WizardJobRow) {
		setOfferText(job.offer_text);
		setContentLocale(parseLocale(job.language));
		setAlsoOtherLanguage(!!job.also_other_language);
		setGenerateLetter(!!job.generate_cover_letter);
		setError(job.error_message ?? null);

		if (job.result_json) {
			const { generation, ...proposedContent } = JSON.parse(job.result_json) as ProposedContent & {
				generation?: { secondaryCvPath: string | null; secondaryCoverLetterPath: string | null };
			};
			setContent(proposedContent as ProposedContent);
			if (job.status === 'done') {
				setResult({
					cvPath: job.cv_path ?? '',
					coverLetterPath: job.cover_letter_path,
					secondaryCvPath: generation?.secondaryCvPath ?? undefined,
					secondaryCoverLetterPath: generation?.secondaryCoverLetterPath ?? null,
				});
			}
		}

		if (job.status === 'error') {
			setStep(job.result_json ? 'relecture' : 'offre');
		} else {
			setStep({ analyzing: 'analyse', ready: 'relecture', generating: 'generation', done: 'termine' }[job.status] as Step);
		}
	}

	// Resume an existing job from ?job=<id>, once on mount.
	useEffect(() => {
		const jobParam = searchParams.get('job');
		const id = jobParam ? Number(jobParam) : null;
		if (!id || !Number.isFinite(id)) return;
		setJobId(id);
		fetch(`/api/jobs/${id}`)
			.then((res) => res.json())
			.then((data) => {
				if (data.job) applyJob(data.job);
			})
			.catch(() => setError(t.wizard.analyzeFailed));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useJobPolling(jobId, step === 'analyse' || step === 'generation', applyJob);

	function schedulePatch(body: Record<string, unknown>) {
		if (!jobId) return;
		if (patchTimer.current) clearTimeout(patchTimer.current);
		patchTimer.current = setTimeout(() => {
			fetch(`/api/jobs/${jobId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			}).catch(() => {});
		}, PATCH_DEBOUNCE_MS);
	}

	function handleContentChange(next: ProposedContent) {
		setContent(next);
		schedulePatch({ content: next });
	}

	function handleToggleGenerateLetter(value: boolean) {
		setGenerateLetter(value);
		schedulePatch({ generateCoverLetter: value });
	}

	function handleToggleSecondaryLanguage(value: boolean) {
		setAlsoOtherLanguage(value);
		schedulePatch({ alsoOtherLanguage: value });
	}

	async function handleAnalyze() {
		setError(null);
		setStep('analyse');
		try {
			const res = await fetch('/api/jobs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ offerText, language: locale }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.wizard.analyzeFailed);
			setJobId(data.jobId);
			setContentLocale(locale);
			router.replace(`/nouvelle?job=${data.jobId}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setStep('offre');
		}
	}

	async function handleGenerate() {
		if (!jobId) return;
		setError(null);
		setStep('generation');
		try {
			const res = await fetch(`/api/jobs/${jobId}/generate`, { method: 'POST' });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.wizard.generateFailed);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setStep('relecture');
		}
	}

	function reset() {
		setJobId(null);
		setStep('offre');
		setOfferText('');
		setContent(null);
		setAlsoOtherLanguage(false);
		setGenerateLetter(true);
		setResult(null);
		setError(null);
		router.replace('/nouvelle');
	}

	return (
		<div>
			<div className='topbar'>
				<MenuButton />
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
								onChange={handleContentChange}
								generateCoverLetter={generateLetter}
								onToggleGenerateCoverLetter={handleToggleGenerateLetter}
								primaryLanguageLabel={langLabel(contentLocale)}
								secondaryLanguageLabel={langLabel(otherLocale)}
								secondaryLanguageChecked={alsoOtherLanguage}
								onToggleSecondaryLanguage={handleToggleSecondaryLanguage}
							/>
						</div>
						<div className='wizard-preview-sticky'>
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
								<label>
									{t.wizard.cvLabel} ({langLabel(contentLocale)})
								</label>
								<CopyablePath label={t.wizard.cvLabel} path={result.cvPath} />
							</div>
							{result.coverLetterPath && (
								<div className='field'>
									<label>
										{t.wizard.letterLabel} ({langLabel(contentLocale)})
									</label>
									<CopyablePath label={t.wizard.letterLabel} path={result.coverLetterPath} />
								</div>
							)}
							{result.secondaryCvPath && (
								<div className='field'>
									<label>
										{t.wizard.cvLabel} ({langLabel(otherLocale)})
									</label>
									<CopyablePath label={t.wizard.cvLabel} path={result.secondaryCvPath} />
								</div>
							)}
							{result.secondaryCoverLetterPath && (
								<div className='field'>
									<label>
										{t.wizard.letterLabel} ({langLabel(otherLocale)})
									</label>
									<CopyablePath label={t.wizard.letterLabel} path={result.secondaryCoverLetterPath} />
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
