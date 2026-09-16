import { Dict } from './i18n';
import { FitCategory, FitCategoryKey, FitDecision, FitResult } from './types';

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
