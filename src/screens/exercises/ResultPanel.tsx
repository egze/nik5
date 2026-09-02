import { Link } from 'react-router-dom';

export interface ResultReviewItem {
  entryId: string;
  prompt: string;
  value: string;
  accepted: string[];
  correct: boolean;
}

interface ResultPanelProps {
  eyebrow: string;
  title: string;
  correct: number;
  total: number;
  lessonPath: string;
  onRestart?: () => void;
  retryPath?: string;
  reviewItems?: ResultReviewItem[];
}

export function ResultPanel({
  eyebrow,
  title,
  correct,
  total,
  lessonPath,
  onRestart,
  retryPath,
  reviewItems,
}: ResultPanelProps) {
  const percentage = total === 0 ? 0 : Math.round(correct / total * 100);
  const missed = total - correct;

  return (
    <section className="result-panel exercise-summary" aria-labelledby="result-title">
      <p className="eyebrow">{eyebrow}</p>
      <h1 id="result-title">{title}</h1>
      <p className="result-panel__score" role="status">
        {correct} von {total} richtig ({percentage} %)
      </p>
      {reviewItems ? <p>{missed === 1 ? '1 Fehler' : `${missed} Fehler`}</p> : null}
      <div className="exercise-actions">
        {onRestart ? <button type="button" onClick={onRestart}>Noch einmal</button> : null}
        {retryPath ? <Link className="button-link" to={retryPath}>Fehler wiederholen</Link> : null}
        <Link className="button-link button-link--secondary" to={lessonPath}>Zur Lektion</Link>
      </div>
      {reviewItems ? (
        <section className="result-review" aria-labelledby="result-review-title">
          <h2 id="result-review-title">Auswertung</h2>
          <ol>
            {reviewItems.map((item) => (
              <li className={item.correct ? 'result-review__item result-review__item--correct' : 'result-review__item result-review__item--wrong'} key={item.entryId}>
                <div className="result-review__status">
                  <span aria-hidden="true">{item.correct ? '✓' : '✕'}</span>
                  <strong>{item.correct ? 'Richtig' : 'Nicht richtig'}</strong>
                </div>
                <p className="result-review__prompt">{item.prompt}</p>
                <dl>
                  <div>
                    <dt>Deine Antwort</dt>
                    <dd>{item.value || 'Keine Antwort'}</dd>
                  </div>
                  <div>
                    <dt>Akzeptierte Antwort</dt>
                    <dd>{item.accepted.join(' / ')}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </section>
  );
}
