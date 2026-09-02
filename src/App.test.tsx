import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the German application identity', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Lernraum' })).toBeInTheDocument();
    expect(screen.getByText('Dein Platz zum Üben')).toBeInTheDocument();
  });
});
