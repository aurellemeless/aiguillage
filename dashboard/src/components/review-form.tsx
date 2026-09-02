'use client';

import { CoverLetterContent, CvContent, ProposedContent } from '@/lib/types';
import { useLocale } from '@/lib/locale-context';
import { Dict } from '@/lib/i18n';
import { SkillsEditor, ExperienceEditor } from '@/components/list-editors';

interface ReviewFormProps {
	content: ProposedContent;
	onChange: (content: ProposedContent) => void;
	generateCoverLetter: boolean;
	onToggleGenerateCoverLetter: (value: boolean) => void;
	primaryLanguageLabel: string;
	secondaryLanguageLabel: string;
	secondaryLanguageChecked: boolean;
	onToggleSecondaryLanguage: (value: boolean) => void;
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
	primaryLanguageLabel,
	secondaryLanguageLabel,
	secondaryLanguageChecked,
	onToggleSecondaryLanguage,
}: ReviewFormProps) {
	const { t } = useLocale();
	return (
		<div>
			<div className='exp-row'>
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
			<div style={{ margin: '18px 0' }}>
				<div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink-soft)', fontWeight: 600, marginBottom: 8 }}>
					{t.reviewForm.languagesToGenerate}
				</div>
				<div style={{ display: 'flex', gap: 16 }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
						<input type='checkbox' checked disabled />
						{primaryLanguageLabel}
					</label>
					<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
						<input
							type='checkbox'
							checked={secondaryLanguageChecked}
							onChange={(e) => onToggleSecondaryLanguage(e.target.checked)}
						/>
						{secondaryLanguageLabel}
					</label>
				</div>
			</div>
			<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, marginBottom: 18 }}>
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
