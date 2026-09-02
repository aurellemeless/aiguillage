'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from '@/lib/locale-context';
import { SkillsEditor, ExperienceEditor } from '@/components/list-editors';
import { IdentityEditor, RowListEditor, PersonalProjectsEditor, DepthNotesEditor } from '@/components/profile-editors';
import { ProfileData, ProfileCertification, ProfileEducation, ProfileLanguage, linesToSkills, normalizeProfile, skillsToLines } from '@/lib/profile-types';
import MenuButton from '@/components/menu-button';

function clone(profile: ProfileData): ProfileData {
	return JSON.parse(JSON.stringify(profile));
}

export default function ProfilePage() {
	const { locale, t } = useLocale();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [profile, setProfile] = useState<ProfileData | null>(null);
	const [savedSnapshot, setSavedSnapshot] = useState<ProfileData | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [importing, setImporting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [status, setStatus] = useState<string | null>(null);

	useEffect(() => {
		fetch('/api/profile')
			.then((res) => res.json())
			.then((data) => {
				const normalized = normalizeProfile(data.profile);
				setProfile(normalized);
				setSavedSnapshot(clone(normalized));
			})
			.catch(() => setError(t.profile.loadFailed))
			.finally(() => setLoading(false));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const dirty = profile && savedSnapshot ? JSON.stringify(profile) !== JSON.stringify(savedSnapshot) : false;

	function update(patch: Partial<ProfileData>) {
		setProfile((prev) => (prev ? { ...prev, ...patch } : prev));
	}

	async function handleImport(file: File) {
		setError(null);
		setImporting(true);
		setStatus(t.profile.analyzing);
		try {
			const formData = new FormData();
			formData.append('file', file);
			formData.append('language', locale);
			const res = await fetch('/api/profile/extract', { method: 'POST', body: formData });
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.profile.extractFailed);
			setProfile(normalizeProfile(data.profile));
			setStatus(t.profile.extracted);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			setStatus(null);
		} finally {
			setImporting(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	}

	async function handleSave() {
		if (!profile) return;
		setError(null);
		setSaving(true);
		try {
			const res = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(profile),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error ?? t.profile.saveFailed);
			setSavedSnapshot(clone(profile));
			setStatus(t.profile.savedStatus);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	}

	function handleCancel() {
		if (savedSnapshot) setProfile(clone(savedSnapshot));
		setStatus(null);
		setError(null);
	}

	if (loading || !profile) {
		return (
			<div>
				<div className='topbar'>
					<MenuButton />
					<h1>{t.profile.title}</h1>
				</div>
				<div className='content'>
					<div className='center-state'>
						<div className='scanline' />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div>
			<div className='topbar'>
				<MenuButton />
				<h1>{t.profile.title}</h1>
			</div>
			<div className='content'>
				{error && <div className='error-box'>{error}</div>}
				<p className='note' style={{ marginBottom: 18 }}>
					{t.profile.intro}
				</p>

				<label className='import-card' style={{ cursor: importing ? 'default' : 'pointer' }}>
					<div className='icon'>↑</div>
					<div className='txt'>
						<b>{t.profile.importTitle}</b>
						<span>{t.profile.importHint}</span>
					</div>
					<input
						ref={fileInputRef}
						type='file'
						accept='.pdf,.docx'
						style={{ display: 'none' }}
						disabled={importing}
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) handleImport(file);
						}}
					/>
					<button
						type='button'
						className='btn subtle'
						disabled={importing}
						onClick={() => fileInputRef.current?.click()}
					>
						{importing ? '…' : t.profile.chooseFile}
					</button>
				</label>

				<IdentityEditor identity={profile.identity} onChange={(identity) => update({ identity })} t={t} />

				<div className='form-section'>
					<div className='form-section-head'>
						<h2>{t.reviewForm.skills}</h2>
						<span className='hint'>{t.profileForm.skillsHint}</span>
					</div>
					<div className='form-section-body'>
						<SkillsEditor
							skills={skillsToLines(profile.skills)}
							onChange={(lines) => update({ skills: linesToSkills(lines) })}
							t={t}
							addable
							title=''
						/>
					</div>
				</div>

				<div className='form-section'>
					<div className='form-section-head'>
						<h2>{t.reviewForm.experience}</h2>
						<span className='hint'>{t.profileForm.experienceHint}</span>
					</div>
					<div className='form-section-body'>
						<ExperienceEditor
							title=''
							items={profile.experience}
							onChange={(experience) => update({ experience })}
							t={t}
							addable
							addLabel={t.profileForm.addExperience}
						/>
					</div>
				</div>

				<div className='form-section'>
					<div className='form-section-head'>
						<h2>{t.profileForm.education}</h2>
					</div>
					<div className='form-section-body'>
						<RowListEditor<ProfileEducation>
							items={profile.education}
							onChange={(education) => update({ education })}
							fields={[
								{ key: 'degree', placeholder: t.profileForm.degree },
								{ key: 'institution', placeholder: t.profileForm.institution },
								{ key: 'year', placeholder: t.profileForm.year },
							]}
							addLabel={t.profileForm.addEducation}
						/>
					</div>
				</div>

				<div className='form-section'>
					<div className='form-section-head'>
						<h2>{t.profileForm.certifications}</h2>
					</div>
					<div className='form-section-body'>
						<RowListEditor<ProfileCertification>
							items={profile.certifications}
							onChange={(certifications) => update({ certifications })}
							fields={[
								{ key: 'name', placeholder: t.profileForm.certName },
								{ key: 'organization', placeholder: t.profileForm.organization },
								{ key: 'year', placeholder: t.profileForm.year },
							]}
							addLabel={t.profileForm.addCertification}
						/>
					</div>
				</div>

				<div className='form-section'>
					<div className='form-section-head'>
						<h2>{t.profileForm.languages}</h2>
					</div>
					<div className='form-section-body'>
						<RowListEditor<ProfileLanguage>
							items={profile.languages}
							onChange={(languages) => update({ languages })}
							fields={[
								{ key: 'language', placeholder: t.profileForm.language },
								{ key: 'level', placeholder: t.profileForm.level },
							]}
							addLabel={t.profileForm.addLanguage}
							twoColumn
						/>
					</div>
				</div>

				<div className='form-section'>
					<div className='form-section-head'>
						<h2>{t.profileForm.drivingLicense}</h2>
					</div>
					<div className='form-section-body'>
						<div className='field' style={{ maxWidth: 280, marginBottom: 0 }}>
							<input value={profile.driving_license} onChange={(e) => update({ driving_license: e.target.value })} />
						</div>
					</div>
				</div>

				<PersonalProjectsEditor
					items={profile.personal_projects}
					onChange={(personal_projects) => update({ personal_projects })}
					t={t}
				/>

				<DepthNotesEditor
					items={profile.skills_depth_notes}
					onChange={(skills_depth_notes) => update({ skills_depth_notes })}
					t={t}
				/>

				<div className='savebar' style={{ marginTop: 30 }}>
					<button type='button' className='btn subtle' onClick={handleCancel} disabled={!dirty || saving}>
						{t.profile.cancel}
					</button>
					<button type='button' className='btn' onClick={handleSave} disabled={saving}>
						{t.profile.save}
					</button>
					<span className={`status ${dirty ? 'dirty' : ''}`}>
						{saving ? '…' : dirty ? t.profile.unsavedChanges : status ?? ''}
					</span>
				</div>
			</div>
		</div>
	);
}
