import { Link } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';

export function MissingContent() {
  return (
    <AppLayout>
      <section className="feedback-card feedback-card--error" aria-labelledby="missing-content-title">
        <span aria-hidden="true">!</span>
        <div>
          <h1 id="missing-content-title">Diesen Lerninhalt gibt es nicht.</h1>
          <Link className="button-link" to="/">Zurück zu den Fächern</Link>
        </div>
      </section>
    </AppLayout>
  );
}

export function NotFoundPage() {
  return (
    <AppLayout>
      <section className="feedback-card feedback-card--error" aria-labelledby="not-found-title">
        <span aria-hidden="true">!</span>
        <div>
          <h1 id="not-found-title">Diese Seite gibt es nicht.</h1>
          <Link className="button-link" to="/">Zurück zu den Fächern</Link>
        </div>
      </section>
    </AppLayout>
  );
}
