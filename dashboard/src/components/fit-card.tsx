import { Dict } from '@/lib/i18n';
import { FIT_CATEGORY_ORDER, FIT_DECISION_ICON, FIT_RESULT_ICON, fitCategoryLabel, fitDecisionLabel, fitResultLabel } from '@/lib/fit';
import { FitCategory, FitDecision } from '@/lib/types';

export function FitBadge({ score, decision }: { score: number; decision: FitDecision }) {
	return (
		<span className={`fit-badge fit-decision-${decision}`} title={`${FIT_DECISION_ICON[decision]} ${score}%`}>
			{score}%
		</span>
	);
}

export default function FitCard({
	score,
	decision,
	categories,
	reasons,
	t,
}: {
	score: number;
	decision: FitDecision;
	categories: FitCategory[];
	reasons: string[];
	t: Dict;
}) {
	const byKey = new Map(categories.map((c) => [c.category, c]));
	const ordered = FIT_CATEGORY_ORDER.map((key) => byKey.get(key)).filter((c): c is FitCategory => !!c && c.criteria.length > 0);

	return (
		<div className='fit-card'>
			<div className='fit-head'>
				<div className='fit-score'>
					<span className='fit-score-value font-mono'>{score}%</span>
					<span className='fit-score-label'>{t.fit.score}</span>
				</div>
				<div className={`fit-decision fit-decision-${decision}`}>
					<span>{FIT_DECISION_ICON[decision]}</span>
					<span>{fitDecisionLabel(t, decision)}</span>
				</div>
			</div>

			{ordered.map((cat) => (
				<div className='fit-category' key={cat.category}>
					<div className='fit-category-label'>{fitCategoryLabel(t, cat.category)}</div>
					<table className='fit-table'>
						<tbody>
							{cat.criteria.map((crit, i) => (
								<tr key={i}>
									<td>{crit.label}</td>
									<td className='fit-result'>
										<span>{FIT_RESULT_ICON[crit.result]}</span>
										<span>{fitResultLabel(t, crit.result)}</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			))}

			{reasons.length > 0 && (
				<div className='fit-reasons'>
					<div className='fit-category-label'>{t.fit.reasonsTitle}</div>
					<ul>
						{reasons.map((reason, i) => (
							<li key={i}>{reason}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}
