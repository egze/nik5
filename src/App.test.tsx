import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App, AppRoutes } from './App';
import { ProgressProvider } from './progress/ProgressProvider';

describe('App', () => {
  it('renders the German application identity', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Lernraum' })).toBeInTheDocument();
    expect(screen.getByText('Dein Platz zum Üben')).toBeInTheDocument();
  });

  it.each([
    ['/subjects/spanish/lessons/spanish-01/schreiben', 'Übersetze den Ausdruck'],
    ['/subjects/spanish/lessons/spanish-01/pruefung', 'Teste die ganze Lektion'],
  ])('registers the typed exercise route %s', (path, heading) => {
    render(
      <ProgressProvider>
        <MemoryRouter initialEntries={[path]}>
          <AppRoutes />
        </MemoryRouter>
      </ProgressProvider>,
    );

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });
});
