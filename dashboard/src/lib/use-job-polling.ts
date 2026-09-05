'use client';

import { useEffect, useRef } from 'react';
import type { WizardJobRow } from '@/lib/db';

export function useJobPolling(
	jobId: number | null,
	active: boolean,
	onUpdate: (job: WizardJobRow) => void,
	intervalMs = 3000
) {
	const onUpdateRef = useRef(onUpdate);
	onUpdateRef.current = onUpdate;

	useEffect(() => {
		if (!jobId || !active) return;
		let cancelled = false;

		async function poll() {
			try {
				const res = await fetch(`/api/jobs/${jobId}`);
				if (!res.ok) return;
				const data = await res.json();
				if (!cancelled) onUpdateRef.current(data.job as WizardJobRow);
			} catch {
				// transient network error — retry on the next tick
			}
		}

		poll();
		const interval = setInterval(poll, intervalMs);
		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [jobId, active, intervalMs]);
}
