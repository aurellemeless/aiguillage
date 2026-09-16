import { Dict } from '@/lib/i18n';
import {
	FIT_CATEGORY_ORDER,
	FIT_DECISION_ICON,
	FIT_RESULT_ICON,
	fitCategoryLabel,
	fitCategoryScore,
	fitCategoryTone,
	fitDecisionLabel,
	fitDecisionTone,
	fitResultLabel,
	fitResultTone,
	fitToneLabel,
} from '@/lib/fit';
import { FitCategory, FitDecision } from '@/lib/types';

export function FitBadge({ score, decision }: { score: number; decision: FitDecision }) {
	return (
		<span className={`fit-badge fit-tone-${fitDecisionTone(decision)}`} title={`${FIT_DECISION_ICON[decision]} ${score}%`}>
			{score}%
		</span>
	);
}

const RING_RADIUS = 38;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ScoreMeter({ score, decision, t }: { score: number; decision: FitDecision; t: Dict }) {
	const tone = fitDecisionTone(decision);
	const offset = RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(100, score)) / 100);

	return (
		<div className='fit-meter'>
			<svg viewBox='0 0 96 96' width='96' height='96' className={`fit-ring fit-tone-${tone}`}>
				<circle cx='48' cy='48' r={RING_RADIUS} className='fit-ring-track' strokeWidth='9' fill='none' />
				<circle
					cx='48'
					cy='48'
					r={RING_RADIUS}
					className='fit-ring-fill'
					strokeWidth='9'
					fill='none'
					strokeLinecap='round'
					strokeDasharray={RING_CIRCUMFERENCE}
					strokeDashoffset={offset}
					transform='rotate(-90 48 48)'
				/>
				<text x='48' y='44' textAnchor='middle' className='fit-ring-value'>
					{score}%
				</text>
				<text x='48' y='62' textAnchor='middle' className='fit-ring-label'>
					{t.fit.score}
				</text>
			</svg>
			<div className={`fit-decision fit-tone-${tone}`}>
				<span>{FIT_DECISION_ICON[decision]}</span>
				<span>{fitDecisionLabel(t, decision)}</span>
			</div>
		</div>
	);
}

function CategoryRow({ category, t }: { category: FitCategory; t: Dict }) {
	const score = fitCategoryScore(category.criteria);
	const tone = fitCategoryTone(category.criteria);

	return (
		<div className='fit-category'>
			<div className='fit-category-head'>
				<span className='fit-category-label'>{fitCategoryLabel(t, category.category)}</span>
				<span className={`fit-category-tone fit-tone-${tone}`}>{fitToneLabel(t, tone)}</span>
			</div>
			<div className={`fit-bar-track fit-tone-${tone}`}>
				<div className='fit-bar-fill' style={{ width: `${score}%` }} />
			</div>
			<div className='fit-chips'>
				{category.criteria.map((crit, i) => (
					<span className={`fit-chip fit-tone-${fitResultTone(crit.result)}`} key={i}>
						<span className='fit-chip-icon'>{FIT_RESULT_ICON[crit.result]}</span>
						{crit.label}
						<span className='fit-chip-result'>{fitResultLabel(t, crit.result)}</span>
					</span>
				))}
			</div>
		</div>
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
				<ScoreMeter score={score} decision={decision} t={t} />
				<div className='fit-categories'>
					{ordered.map((cat) => (
						<CategoryRow category={cat} t={t} key={cat.category} />
					))}
				</div>
			</div>

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
