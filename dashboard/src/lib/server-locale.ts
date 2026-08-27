import { cookies } from 'next/headers';
import { Locale, LOCALE_COOKIE, parseLocale } from './i18n';

export async function getServerLocale(): Promise<Locale> {
	const store = await cookies();
	return parseLocale(store.get(LOCALE_COOKIE)?.value);
}
