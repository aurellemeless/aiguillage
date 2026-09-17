import { Dict } from './i18n';
import { FitCategory, FitCategoryKey, FitCriterion, FitDecision, FitResult } from './types';

export interface FitDetails {
	categories: FitCategory[];
	reasons: string[];
}

// `applications.fit_json` holds only { categories, reasons } — score and
// decision live in their own columns for querying/sorting.
export function parseFitDetails(json: string | null): FitDetails | null {
	if (!json) return null;
	try {
		const parsed = JSON.parse(json);
		if (!parsed || !Array.isArray(parsed.categories)) return null;
		return { categories: parsed.categories, reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [] };
	} catch {
		return null;
	}
}

export const FIT_CATEGORY_ORDER: FitCategoryKey[] = [
	'must_have',
	'nice_to_have',
	'domain_experience',
	'constraints',
	'seniority',
];

export const FIT_RESULT_ICON: Record<FitResult, string> = {
	excellent: '✅',
	good: '✅',
	weak: '⚠️',
	missing: '❌',
	not_required: '⚪',
};

export const FIT_DECISION_ICON: Record<FitDecision, string> = {
	apply: '🟢',
	maybe: '🟡',
	skip: '🔴',
};

export function fitCategoryLabel(t: Dict, category: FitCategoryKey): string {
	return {
		must_have: t.fit.categoryMustHave,
		nice_to_have: t.fit.categoryNiceToHave,
		domain_experience: t.fit.categoryDomainExperience,
		constraints: t.fit.categoryConstraints,
		seniority: t.fit.categorySeniority,
	}[category];
}

export function fitResultLabel(t: Dict, result: FitResult): string {
	return {
		excellent: t.fit.resultExcellent,
		good: t.fit.resultGood,
		weak: t.fit.resultWeak,
		missing: t.fit.resultMissing,
		not_required: t.fit.resultNotRequired,
	}[result];
}

export function fitDecisionLabel(t: Dict, decision: FitDecision): string {
	return { apply: t.fit.decisionApply, maybe: t.fit.decisionMaybe, skip: t.fit.decisionSkip }[decision];
}

// Three-tone severity, shared by the meter and every category bar so color
// always means the same thing across the card.
export type FitTone = 'good' | 'warning' | 'danger';

export function fitDecisionTone(decision: FitDecision): FitTone {
	return { apply: 'good', maybe: 'warning', skip: 'danger' }[decision] as FitTone;
}

// Purely a presentation aggregate over the criteria Claude already returned —
// never fed back into score/decision, which stay Claude's own holistic call.
const RESULT_WEIGHT: Record<FitResult, number | null> = {
	excellent: 100,
	good: 70,
	weak: 35,
	missing: 0,
	not_required: null, // excluded from the average — it isn't being judged
};

export function fitCategoryScore(criteria: FitCriterion[]): number {
	const weights = criteria.map((c) => RESULT_WEIGHT[c.result]).filter((w): w is number => w !== null);
	if (weights.length === 0) return 100;
	return Math.round(weights.reduce((a, b) => a + b, 0) / weights.length);
}

// Worst-criterion-wins: one missing requirement should read as a risk even
// if everything else in the category is excellent.
export function fitCategoryTone(criteria: FitCriterion[]): FitTone {
	if (criteria.some((c) => c.result === 'missing')) return 'danger';
	if (criteria.some((c) => c.result === 'weak')) return 'warning';
	return 'good';
}

export function fitToneLabel(t: Dict, tone: FitTone): string {
	return { good: t.fit.toneGood, warning: t.fit.toneWarning, danger: t.fit.toneDanger }[tone];
}

// A single criterion's own result, as a tone for its chip — "not_required" is
// an exclusion, not a severity, and gets its own neutral (non-status) style.
export type FitResultTone = FitTone | 'neutral';

const RESULT_TONE: Record<FitResult, FitResultTone> = {
	excellent: 'good',
	good: 'good',
	weak: 'warning',
	missing: 'danger',
	not_required: 'neutral',
};

export function fitResultTone(result: FitResult): FitResultTone {
	return RESULT_TONE[result];
}
