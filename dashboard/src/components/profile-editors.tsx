'use client';

import { Dict } from '@/lib/i18n';
import { ProfileDepthNote, ProfileIdentity, ProfilePersonalProject } from '@/lib/profile-types';

export function IdentityEditor({
	identity,
	onChange,
	t,
}: {
	identity: ProfileIdentity;
	onChange: (identity: ProfileIdentity) => void;
	t: Dict;
}) {
	function set(patch: Partial<ProfileIdentity>) {
		onChange({ ...identity, ...patch });
	}

	return (
		<div className='form-section'>
			<div className='form-section-head'>
				<h2>{t.profileForm.identity}</h2>
			</div>
			<div className='form-section-body'>
				<div className='field-grid-2'>
					<div className='field'>
						<label>{t.profileForm.name}</label>
						<input value={identity.name} onChange={(e) => set({ name: e.target.value })} />
					</div>
					<div className='field'>
						<label>{t.profileForm.jobTitle}</label>
						<input value={identity.title} onChange={(e) => set({ title: e.target.value })} />
					</div>
				</div>
				<div className='field-grid-2'>
					<div className='field'>
						<label>{t.profileForm.yearsExperience}</label>
						<input
							type='number'
							value={identity.years_experience}
							onChange={(e) => set({ years_experience: e.target.value })}
						/>
					</div>
					<div className='field'>
						<label>{t.profileForm.location}</label>
						<input value={identity.location} onChange={(e) => set({ location: e.target.value })} />
					</div>
				</div>
				<div className='field-grid-2'>
					<div className='field'>
						<label>{t.profileForm.email}</label>
						<input value={identity.email} onChange={(e) => set({ email: e.target.value })} />
					</div>
					<div className='field'>
						<label>{t.profileForm.phone}</label>
						<input value={identity.phone} onChange={(e) => set({ phone: e.target.value })} />
					</div>
				</div>
				<div className='field-grid-2'>
					<div className='field' style={{ marginBottom: 0 }}>
						<label>{t.profileForm.github}</label>
						<input value={identity.github} onChange={(e) => set({ github: e.target.value })} />
					</div>
					<div className='field' style={{ marginBottom: 0 }}>
						<label>{t.profileForm.linkedin}</label>
						<input value={identity.linkedin} onChange={(e) => set({ linkedin: e.target.value })} />
					</div>
				</div>
			</div>
		</div>
	);
}

export function RowListEditor<T extends object>({
	items,
	onChange,
	fields,
	addLabel,
	twoColumn,
}: {
	items: T[];
	onChange: (items: T[]) => void;
	fields: { key: keyof T & string; placeholder: string }[];
	addLabel: string;
	twoColumn?: boolean;
}) {
	function update(index: number, key: keyof T & string, value: string) {
		onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
	}
	function remove(index: number) {
		onChange(items.filter((_, i) => i !== index));
	}
	function add() {
		const blank = Object.fromEntries(fields.map((f) => [f.key, ''])) as unknown as T;
		onChange([...items, blank]);
	}

	return (
		<>
			{items.map((item, index) => (
				<div className={`row-item ${twoColumn ? 'cols-2' : ''}`} key={index}>
					{fields.map((f) => (
						<input
							key={String(f.key)}
							placeholder={f.placeholder}
							value={String(item[f.key] ?? '')}
							onChange={(e) => update(index, f.key, e.target.value)}
						/>
					))}
					<button type='button' className='btn danger-ghost' onClick={() => remove(index)}>
						×
					</button>
				</div>
			))}
			<button type='button' className='add-row' onClick={add}>
				{addLabel}
			</button>
		</>
	);
}

export function PersonalProjectsEditor({
	items,
	onChange,
	t,
}: {
	items: ProfilePersonalProject[];
	onChange: (items: ProfilePersonalProject[]) => void;
	t: Dict;
}) {
	function update(index: number, patch: Partial<ProfilePersonalProject>) {
		onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	}
	function remove(index: number) {
		onChange(items.filter((_, i) => i !== index));
	}

	return (
		<div className='form-section'>
			<div className='form-section-head'>
				<h2>{t.profileForm.personalProjects}</h2>
				<span className='hint'>{t.profileForm.personalProjectsHint}</span>
			</div>
			<div className='form-section-body'>
				{items.map((item, index) => (
					<div className='card-item' key={index}>
						<button type='button' className='btn danger-ghost remove' onClick={() => remove(index)}>
							{t.profileForm.remove}
						</button>
						<div style={{ display: 'flex', gap: 12 }}>
							<div className='field' style={{ flex: 1 }}>
								<label>{t.profileForm.projectName}</label>
								<input value={item.name} onChange={(e) => update(index, { name: e.target.value })} />
							</div>
							<div className='field' style={{ flex: 1 }}>
								<label>{t.profileForm.projectStatus}</label>
								<input
									value={typeof item.status === 'string' ? item.status : ''}
									onChange={(e) => update(index, { status: e.target.value })}
								/>
							</div>
						</div>
						<div className='field'>
							<label>{t.profileForm.projectDescription}</label>
							<textarea rows={2} value={item.description} onChange={(e) => update(index, { description: e.target.value })} />
						</div>
						<div className='field' style={{ marginBottom: 0 }}>
							<label>{t.reviewForm.tech}</label>
							<input
								value={item.tech.join(', ')}
								onChange={(e) =>
									update(index, {
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
				<button
					type='button'
					className='add-row'
					onClick={() => onChange([...items, { name: '', description: '', status: '', tech: [] }])}
				>
					{t.profileForm.addProject}
				</button>
			</div>
		</div>
	);
}

const DEPTH_LEVELS = ['theoretical', 'basic_notions', 'certified_only', 'real', 'gap'] as const;

function depthLevelLabel(level: string, t: Dict): string {
	switch (level) {
		case 'theoretical':
			return t.profileForm.levelTheoretical;
		case 'basic_notions':
			return t.profileForm.levelBasic;
		case 'certified_only':
			return t.profileForm.levelCertifiedOnly;
		case 'gap':
			return t.profileForm.levelGap;
		default:
			return t.profileForm.levelReal;
	}
}

export function DepthNotesEditor({
	items,
	onChange,
	t,
}: {
	items: ProfileDepthNote[];
	onChange: (items: ProfileDepthNote[]) => void;
	t: Dict;
}) {
	function update(index: number, patch: Partial<ProfileDepthNote>) {
		onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	}
	function remove(index: number) {
		onChange(items.filter((_, i) => i !== index));
	}

	return (
		<details className='advanced'>
			<summary>
				<span>
					{t.profileForm.advanced} <span className='note'>({t.profileForm.advancedHint})</span>
				</span>
				<span className='chev'>›</span>
			</summary>
			<div className='form-section-body'>
				{items.map((item, index) => (
					<div className='depth-note' key={index}>
						<input
							placeholder={t.profileForm.depthSkill}
							value={item.skill}
							onChange={(e) => update(index, { skill: e.target.value })}
						/>
						<select value={item.level} onChange={(e) => update(index, { level: e.target.value })}>
							{!DEPTH_LEVELS.includes(item.level as (typeof DEPTH_LEVELS)[number]) && item.level && (
								<option value={item.level}>{item.level}</option>
							)}
							{DEPTH_LEVELS.map((level) => (
								<option key={level} value={level}>
									{depthLevelLabel(level, t)}
								</option>
							))}
						</select>
						<textarea
							rows={2}
							placeholder={t.profileForm.depthNote}
							value={item.note}
							onChange={(e) => update(index, { note: e.target.value })}
						/>
						<button
							type='button'
							className='btn danger-ghost'
							style={{ gridColumn: '1 / -1', justifySelf: 'start' }}
							onClick={() => remove(index)}
						>
							{t.profileForm.remove}
						</button>
					</div>
				))}
				<button
					type='button'
					className='add-row'
					onClick={() => onChange([...items, { skill: '', level: 'real', note: '' }])}
				>
					{t.profileForm.addDepthNote}
				</button>
			</div>
		</details>
	);
}
