'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReviewForm from '@/components/review-form';
import CvPreview from '@/components/cv-preview';
import CopyablePath from '@/components/copyable-path';
import { ProposedContent } from '@/lib/types';

type Step = 'offre' | 'analyse' | 'relecture' | 'generation' | 'termine';

const STEPS: { key: Step; label: string }[] = [
	{ key: 'offre', label: 'Offre' },
	{ key: 'analyse', label: 'Analyse IA' },
	{ key: 'relecture', label: 'Relecture' },
	{ key: 'generation', label: 'Génération' },
	{ key: 'termine', label: 'Terminé' },
];

function Stepper({ step }: { step: Step }) {
	const currentIndex = STEPS.findIndex((s) => s.key === step);
	return (
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
	);
}

export default function NouvelleCandidaturePage() {
	const router = useRouter();
	const [step, setStep] = useState<Step>('offre');
	const [offerText, setOfferText] = useState('');
	const [content, setContent] = useState<ProposedContent | null>(null);
	const [generateLetter, setGenerateLetter] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<{ cvPath: string; coverLetterPath: string | null } | null>(null);

	async function handleAnalyze() {
		setError(null);
		setStep('analyse');
		try {
			const res = await fetch('/api/analyze', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ offerText }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? "Échec de l'analyse.");
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
				}),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? 'Échec de la génération.');
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
				<h1>Nouvelle candidature</h1>
			</div>
			<div className='content'>
				<Stepper step={step} />
				{error && <div className='error-box'>{error}</div>}

				{step === 'offre' && (
					<div style={{ maxWidth: 640 }}>
						<div className='field'>
							<label>Offre d&apos;emploi</label>
							<textarea
								rows={14}
								placeholder="Colle ici le texte de l'offre…"
								value={offerText}
								onChange={(e) => setOfferText(e.target.value)}
							/>
						</div>
						<div className='wizard-actions'>
							<button className='btn' onClick={handleAnalyze} disabled={!offerText.trim()}>
								Analyser
							</button>
						</div>
					</div>
				)}

				{step === 'analyse' && (
					<div className='center-state'>
						<div className='scanline' />
						<div>Lecture de l&apos;offre et rédaction du CV adapté… (jusqu&apos;à une minute)</div>
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
							Retour
						</button>
						<button className='btn' onClick={handleGenerate}>
							Valider et générer
						</button>
					</div>
				)}

				{step === 'generation' && (
					<div className='center-state'>
						<div className='scanline' />
						<div>Génération du CV et de la lettre (.docx)…</div>
					</div>
				)}

				{step === 'termine' && result && (
					<div>
						<div className='center-state' style={{ paddingBottom: 24 }}>
							<div className='done-icon'>✓</div>
							<div>
								<b>Candidature enregistrée</b>
								<br />
								<span className='note'>Ajoutée au registre — colonne « Envoyé »</span>
							</div>
						</div>
						<div style={{ maxWidth: 480, margin: '0 auto' }}>
							<div className='field'>
								<label>CV</label>
								<CopyablePath label='CV' path={result.cvPath} />
							</div>
							{result.coverLetterPath && (
								<div className='field'>
									<label>Lettre</label>
									<CopyablePath label='Lettre' path={result.coverLetterPath} />
								</div>
							)}
						</div>
						<div className='wizard-actions' style={{ justifyContent: 'center' }}>
							<button className='btn subtle' onClick={reset}>
								Nouvelle candidature
							</button>
							<button className='btn' onClick={() => router.push('/applications')}>
								Voir dans le registre
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
