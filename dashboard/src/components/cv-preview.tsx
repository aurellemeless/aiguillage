'use client';

import { ProposedContent } from '@/lib/types';
import { useLocale } from '@/lib/locale-context';

export default function CvPreview({ content }: { content: ProposedContent }) {
	const { t } = useLocale();
	const { cv } = content;
	const firstExperience = cv.experience[0];
	const allSkills = cv.skills.flatMap((s) => s.values).slice(0, 8);

	return (
		<div>
			<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
				<span className='note'>{t.cvPreview.preview}</span>
				<span className='badge-live'>{t.cvPreview.live}</span>
			</div>
			<div className='preview-card'>
				<div className='h1'>{cv.headline || t.cvPreview.headlinePlaceholder}</div>
				<div className='tag'>
					{t.cvPreview.applicationFor(content.company || t.reviewForm.company)}
					{content.role ? ` · ${content.role}` : ''}
				</div>
				{cv.tagline && <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: -8, marginBottom: 14 }}>{cv.tagline}</p>}
				{allSkills.length > 0 && (
					<div className='skillrow'>
						{allSkills.map((skill) => (
							<span key={skill} className='chip'>
								{skill}
							</span>
						))}
					</div>
				)}
				{firstExperience && (
					<div className='exp'>
						<div className='role'>{firstExperience.role}</div>
						<div className='co'>
							{firstExperience.company} · {firstExperience.dates}
						</div>
						<ul>
							{firstExperience.bullets.slice(0, 3).map((bullet, i) => (
								<li key={i}>{bullet}</li>
							))}
						</ul>
					</div>
				)}
				{cv.experience.length > 1 && (
					<p className='note' style={{ marginTop: 10 }}>
						{t.cvPreview.moreExperience(cv.experience.length - 1)}
					</p>
				)}
			</div>
		</div>
	);
}
