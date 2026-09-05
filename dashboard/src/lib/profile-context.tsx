'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PROFILE_COOKIE } from './profile-constants';
import type { ProfileSummary } from './profiles';

interface ProfileContextValue {
	profileSlug: string | null;
	profiles: ProfileSummary[];
	setProfileSlug: (slug: string, redirectTo?: string) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({
	initialSlug,
	initialProfiles,
	children,
}: {
	initialSlug: string | null;
	initialProfiles: ProfileSummary[];
	children: React.ReactNode;
}) {
	const router = useRouter();
	const [profileSlug, setProfileSlugState] = useState<string | null>(initialSlug);

	const setProfileSlug = useCallback(
		(next: string, redirectTo: string = '/') => {
			setProfileSlugState(next);
			document.cookie = `${PROFILE_COOKIE}=${next}; path=/; max-age=31536000`;
			router.push(redirectTo);
			router.refresh();
		},
		[router]
	);

	const value = useMemo(
		() => ({ profileSlug, profiles: initialProfiles, setProfileSlug }),
		[profileSlug, initialProfiles, setProfileSlug]
	);

	return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
	const ctx = useContext(ProfileContext);
	if (!ctx) throw new Error('useProfile must be used within a ProfileProvider');
	return ctx;
}
