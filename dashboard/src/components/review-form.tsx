'use client';

import { CoverLetterContent, CvContent, ExperienceBlock, ProposedContent, SkillLine } from '@/lib/types';

interface ReviewFormProps {
	content: ProposedContent;
	onChange: (content: ProposedContent) => void;
	generateCoverLetter: boolean;
	onToggleGenerateCoverLetter: (value: boolean) => void;
}

function ExperienceEditor({
	title,
	items,
	onChange,
}: {
	title: string;
	items: ExperienceBlock[];
	onChange: (items: ExperienceBlock[]) => void;
}) {
	function updateItem(index: number, patch: Partial<ExperienceBlock>) {
		const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
		onChange(next);
	}

	return (
		<div style={{ marginBottom: 22 }}>
			<h3 style={{ fontSize: 14, marginBottom: 12 }}>{title}</h3>
			{items.map((item, index) => (
				<div key={index} style={{ border: '1px solid var(--rule)', borderRadius: 6, padding: 14, marginBottom: 12 }}>
					<div style={{ display: 'flex', gap: 12 }}>
						<div className='field' style={{ flex: 1 }}>
							<label>Entreprise</label>
							<input value={item.company} onChange={(e) => updateItem(index, { company: e.target.value })} />
						</div>
						<div className='field' style={{ flex: 1 }}>
							<label>Dates</label>
							<input value={item.dates} onChange={(e) => updateItem(index, { dates: e.target.value })} />
						</div>
					</div>
					<div className='field'>
						<label>Poste</label>
						<input value={item.role} onChange={(e) => updateItem(index, { role: e.target.value })} />
					</div>
					<div className='field'>
						<label>Bullets (une par ligne)</label>
						<textarea
							rows={4}
							value={item.bullets.join('\n')}
							onChange={(e) => updateItem(index, { bullets: e.target.value.split('\n').filter(Boolean) })}
						/>
					</div>
					<div className='field' style={{ marginBottom: 0 }}>
						<label>Tech (séparée par des virgules)</label>
						<input
							value={item.tech.join(', ')}
							onChange={(e) =>
								updateItem(index, {
									tech: e.target.value
										.split(',')
										.map((t) => t.trim())
										.filter(Boolean),
								})
							}
						/>
					</div>
				</div>
			))}
		</div>
	);
}

function SkillsEditor({ skills, onChange }: { skills: SkillLine[]; onChange: (skills: SkillLine[]) => void }) {
	function updateSkill(index: number, patch: Partial<SkillLine>) {
		onChange(skills.map((s, i) => (i === index ? { ...s, ...patch } : s)));
	}

	return (
		<div style={{ marginBottom: 22 }}>
			<h3 style={{ fontSize: 14, marginBottom: 12 }}>Compétences</h3>
			{skills.map((skill, index) => (
				<div key={index} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
					<input
						style={{
							width: 160,
							border: '1px solid var(--rule)',
							borderRadius: 5,
							padding: '9px 11px',
							background: 'var(--paper)',
							color: 'var(--ink)',
						}}
						value={skill.label}
						onChange={(e) => updateSkill(index, { label: e.target.value })}
					/>
					<input
						style={{
							flex: 1,
							border: '1px solid var(--rule)',
							borderRadius: 5,
							padding: '9px 11px',
							background: 'var(--paper)',
							color: 'var(--ink)',
						}}
						value={skill.values.join(', ')}
						onChange={(e) =>
							updateSkill(index, {
								values: e.target.value
									.split(',')
									.map((v) => v.trim())
									.filter(Boolean),
							})
						}
					/>
				</div>
			))}
		</div>
	);
}

function CvEditor({ cv, onChange }: { cv: CvContent; onChange: (cv: CvContent) => void }) {
	return (
		<div>
			<h2 style={{ fontSize: 16, marginBottom: 16 }}>CV</h2>
			<div className='field'>
				<label>Headline</label>
				<input value={cv.headline} onChange={(e) => onChange({ ...cv, headline: e.target.value })} />
			</div>
			<div className='field'>
				<label>Tagline</label>
				<input value={cv.tagline ?? ''} onChange={(e) => onChange({ ...cv, tagline: e.target.value })} />
			</div>
			<div className='field'>
				<label>Résumé (optionnel)</label>
				<textarea rows={2} value={cv.summary ?? ''} onChange={(e) => onChange({ ...cv, summary: e.target.value })} />
			</div>
			<SkillsEditor skills={cv.skills} onChange={(skills) => onChange({ ...cv, skills })} />
			<ExperienceEditor title='Expériences' items={cv.experience} onChange={(experience) => onChange({ ...cv, experience })} />
			{cv.personal_projects && cv.personal_projects.length > 0 && (
				<ExperienceEditor
					title='Projets personnels'
					items={cv.personal_projects}
					onChange={(personal_projects) => onChange({ ...cv, personal_projects })}
				/>
			)}
		</div>
	);
}

function CoverLetterEditor({
	coverLetter,
	onChange,
}: {
	coverLetter: CoverLetterContent;
	onChange: (coverLetter: CoverLetterContent) => void;
}) {
	return (
		<div>
			<h2 style={{ fontSize: 16, marginBottom: 16 }}>Lettre de motivation</h2>
			<div className='field'>
				<label>Destinataire</label>
				<input value={coverLetter.recipient ?? ''} onChange={(e) => onChange({ ...coverLetter, recipient: e.target.value })} />
			</div>
			<div className='field'>
				<label>Objet</label>
				<input value={coverLetter.subject ?? ''} onChange={(e) => onChange({ ...coverLetter, subject: e.target.value })} />
			</div>
			<div className='field'>
				<label>Corps (paragraphes séparés par une ligne vide)</label>
				<textarea
					rows={10}
					value={coverLetter.body.join('\n\n')}
					onChange={(e) =>
						onChange({
							...coverLetter,
							body: e.target.value.split(/\n\s*\n/).filter((p) => p.trim()),
						})
					}
				/>
			</div>
		</div>
	);
}

export default function ReviewForm({
	content,
	onChange,
	generateCoverLetter,
	onToggleGenerateCoverLetter,
}: ReviewFormProps) {
	return (
		<div>
			<div style={{ display: 'flex', gap: 16 }}>
				<div className='field' style={{ flex: 1 }}>
					<label>Entreprise</label>
					<input value={content.company} onChange={(e) => onChange({ ...content, company: e.target.value })} />
				</div>
				<div className='field' style={{ flex: 1 }}>
					<label>Poste</label>
					<input value={content.role} onChange={(e) => onChange({ ...content, role: e.target.value })} />
				</div>
			</div>
			<CvEditor cv={content.cv} onChange={(cv) => onChange({ ...content, cv })} />
			<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, margin: '18px 0' }}>
				<input
					type='checkbox'
					checked={generateCoverLetter}
					onChange={(e) => onToggleGenerateCoverLetter(e.target.checked)}
				/>
				Générer aussi la lettre de motivation
			</label>
			{generateCoverLetter && (
				<CoverLetterEditor coverLetter={content.cover_letter} onChange={(cover_letter) => onChange({ ...content, cover_letter })} />
			)}
		</div>
	);
}
