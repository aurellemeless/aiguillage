import { cookies } from 'next/headers';
import { PROFILE_COOKIE } from './profile-constants';
import { getDefaultProfileSlug, listProfiles } from './profiles';

export async function getServerProfileSlug(): Promise<string | null> {
	const store = await cookies();
	const cookieSlug = store.get(PROFILE_COOKIE)?.value;
	const profiles = listProfiles();
	if (profiles.length === 0) return null;
	if (cookieSlug && profiles.some((p) => p.slug === cookieSlug)) return cookieSlug;
	return getDefaultProfileSlug() ?? profiles[0].slug;
}
