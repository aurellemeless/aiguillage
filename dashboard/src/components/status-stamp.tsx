'use client';

import { stampClassForStatus } from '@/lib/status';
import { statusLabel } from '@/lib/i18n';
import { useLocale } from '@/lib/locale-context';

export default function StatusStamp({ status }: { status: string }) {
	const { locale } = useLocale();
	return <span className={`stamp ${stampClassForStatus(status)}`}>{statusLabel(status, locale)}</span>;
}
