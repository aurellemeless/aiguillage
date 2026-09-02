'use client';

import { ExperienceBlock, SkillLine } from '@/lib/types';
import { Dict } from '@/lib/i18n';

export function SkillsEditor({
	skills,
	onChange,
	t,
	addable,
	title,
}: {
	skills: SkillLine[];
	onChange: (skills: SkillLine[]) => void;
	t: Dict;
	addable?: boolean;
	title?: string;
}) {
	function updateSkill(index: number, patch: Partial<SkillLine>) {
		onChange(skills.map((s, i) => (i === index ? { ...s, ...patch } : s)));
	}
	function removeSkill(index: number) {
		onChange(skills.filter((_, i) => i !== index));
	}

	return (
		<div style={{ marginBottom: 22 }}>
			{title !== '' && <h3 style={{ fontSize: 14, marginBottom: 12 }}>{title ?? t.reviewForm.skills}</h3>}
			{skills.map((skill, index) => (
				<div key={index} className='skill-row'>
					<input
						className='skill-label-input'
						placeholder={addable ? t.profileForm.category : undefined}
						value={skill.label}
						onChange={(e) => updateSkill(index, { label: e.target.value })}
					/>
					<input
						className='skill-values-input'
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
					{addable && (
						<button type='button' className='btn danger-ghost' onClick={() => removeSkill(index)}>
							{t.profileForm.remove}
						</button>
					)}
				</div>
			))}
			{addable && (
				<button type='button' className='add-row' onClick={() => onChange([...skills, { label: '', values: [] }])}>
					{t.profileForm.addSkillCategory}
				</button>
			)}
		</div>
	);
}

export function ExperienceEditor({
	title,
	items,
	onChange,
	t,
	addable,
	addLabel,
}: {
	title: string;
	items: ExperienceBlock[];
	onChange: (items: ExperienceBlock[]) => void;
	t: Dict;
	addable?: boolean;
	addLabel?: string;
}) {
	function updateItem(index: number, patch: Partial<ExperienceBlock>) {
		onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	}
	function removeItem(index: number) {
		onChange(items.filter((_, i) => i !== index));
	}

	return (
		<div style={{ marginBottom: 22 }}>
			<h3 style={{ fontSize: 14, marginBottom: 12 }}>{title}</h3>
			{items.map((item, index) => (
				<div className='card-item' key={index}>
					{addable && (
						<button type='button' className='btn danger-ghost remove' onClick={() => removeItem(index)}>
							{t.profileForm.remove}
						</button>
					)}
					<div className='exp-row'>
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
			{addable && (
				<button
					type='button'
					className='add-row'
					onClick={() => onChange([...items, { company: '', dates: '', role: '', bullets: [], tech: [] }])}
				>
					{addLabel}
				</button>
			)}
		</div>
	);
}
