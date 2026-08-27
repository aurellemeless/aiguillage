'use client';

import { CoverLetterContent, CvContent, ExperienceBlock, ProposedContent, SkillLine } from '@/lib/types';
import { useLocale } from '@/lib/locale-context';
import { Dict } from '@/lib/i18n';

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
	t,
}: {
	title: string;
	items: ExperienceBlock[];
	onChange: (items: ExperienceBlock[]) => void;
	t: Dict;
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
							<label>{t.reviewForm.company}</label>
							<input value={item.company} onChange={(e) => updateItem(index, { company: e.target.value })} />
						</div>
						<div className='field' style={{ flex: 1 }}>
							<label>{t.reviewForm.dates}</label>
							<input value={item.dates} onChange={(e) => updateItem(index, { dates: e.target.value })} />
						</div>
					</div>
					<div className='field'>
						<label>{t.reviewForm.role}</label>
						<input value={item.role} onChange={(e) => updateItem(index, { role: e.target.value })} />
					</div>
					<div className='field'>
						<label>{t.reviewForm.bullets}</label>
						<textarea
							rows={4}
							value={item.bullets.join('\n')}
							onChange={(e) => updateItem(index, { bullets: e.target.value.split('\n').filter(Boolean) })}
						/>
					</div>
					<div className='field' style={{ marginBottom: 0 }}>
						<label>{t.reviewForm.tech}</label>
						<input
							value={item.tech.join(', ')}
							onChange={(e) =>
								updateItem(index, {
									tech: e.target.value
										.split(',')
										.map((v) => v.trim())
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

function SkillsEditor({ skills, onChange, t }: { skills: SkillLine[]; onChange: (skills: SkillLine[]) => void; t: Dict }) {
	function updateSkill(index: number, patch: Partial<SkillLine>) {
		onChange(skills.map((s, i) => (i === index ? { ...s, ...patch } : s)));
	}

	return (
		<div style={{ marginBottom: 22 }}>
			<h3 style={{ fontSize: 14, marginBottom: 12 }}>{t.reviewForm.skills}</h3>
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

function CvEditor({ cv, onChange, t }: { cv: CvContent; onChange: (cv: CvContent) => void; t: Dict }) {
	return (
		<div>
			<h2 style={{ fontSize: 16, marginBottom: 16 }}>{t.reviewForm.cvHeading}</h2>
			<div className='field'>
				<label>{t.reviewForm.headline}</label>
				<input value={cv.headline} onChange={(e) => onChange({ ...cv, headline: e.target.value })} />
			</div>
			<div className='field'>
				<label>{t.reviewForm.tagline}</label>
				<input value={cv.tagline ?? ''} onChange={(e) => onChange({ ...cv, tagline: e.target.value })} />
			</div>
			<div className='field'>
				<label>{t.reviewForm.summary}</label>
				<textarea rows={2} value={cv.summary ?? ''} onChange={(e) => onChange({ ...cv, summary: e.target.value })} />
			</div>
			<SkillsEditor skills={cv.skills} onChange={(skills) => onChange({ ...cv, skills })} t={t} />
			<ExperienceEditor
				title={t.reviewForm.experience}
				items={cv.experience}
				onChange={(experience) => onChange({ ...cv, experience })}
				t={t}
			/>
			{cv.personal_projects && cv.personal_projects.length > 0 && (
				<ExperienceEditor
					title={t.reviewForm.personalProjects}
					items={cv.personal_projects}
					onChange={(personal_projects) => onChange({ ...cv, personal_projects })}
					t={t}
				/>
			)}
		</div>
	);
}

function CoverLetterEditor({
	coverLetter,
	onChange,
	t,
}: {
	coverLetter: CoverLetterContent;
	onChange: (coverLetter: CoverLetterContent) => void;
	t: Dict;
}) {
	return (
		<div>
			<h2 style={{ fontSize: 16, marginBottom: 16 }}>{t.reviewForm.letterHeading}</h2>
			<div className='field'>
				<label>{t.reviewForm.recipient}</label>
				<input value={coverLetter.recipient ?? ''} onChange={(e) => onChange({ ...coverLetter, recipient: e.target.value })} />
			</div>
			<div className='field'>
				<label>{t.reviewForm.subject}</label>
				<input value={coverLetter.subject ?? ''} onChange={(e) => onChange({ ...coverLetter, subject: e.target.value })} />
			</div>
			<div className='field'>
				<label>{t.reviewForm.body}</label>
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
	const { t } = useLocale();
	return (
		<div>
			<div style={{ display: 'flex', gap: 16 }}>
				<div className='field' style={{ flex: 1 }}>
					<label>{t.reviewForm.company}</label>
					<input value={content.company} onChange={(e) => onChange({ ...content, company: e.target.value })} />
				</div>
				<div className='field' style={{ flex: 1 }}>
					<label>{t.reviewForm.role}</label>
					<input value={content.role} onChange={(e) => onChange({ ...content, role: e.target.value })} />
				</div>
			</div>
			<CvEditor cv={content.cv} onChange={(cv) => onChange({ ...content, cv })} t={t} />
			<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, margin: '18px 0' }}>
				<input
					type='checkbox'
					checked={generateCoverLetter}
					onChange={(e) => onToggleGenerateCoverLetter(e.target.checked)}
				/>
				{t.reviewForm.generateLetter}
			</label>
			{generateCoverLetter && (
				<CoverLetterEditor coverLetter={content.cover_letter} onChange={(cover_letter) => onChange({ ...content, cover_letter })} t={t} />
			)}
		</div>
	);
}
