'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dict, Locale, LOCALE_COOKIE, getDict } from './i18n';

interface LocaleContextValue {
	locale: Locale;
	t: Dict;
	setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
	const router = useRouter();
	const [locale, setLocaleState] = useState<Locale>(initialLocale);

	const setLocale = useCallback(
		(next: Locale) => {
			setLocaleState(next);
			document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
			router.refresh();
		},
		[router]
	);

	const value = useMemo(() => ({ locale, t: getDict(locale), setLocale }), [locale, setLocale]);

	return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
	const ctx = useContext(LocaleContext);
	if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
	return ctx;
}
