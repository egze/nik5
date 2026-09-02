import type { Direction } from '../exercises/engine';

interface DirectionPickerProps {
  onSelect(direction: Direction): void;
}

export function DirectionPicker({ onSelect }: DirectionPickerProps) {
  return (
    <section className="direction-picker" aria-labelledby="direction-title">
      <p className="eyebrow">Übungsrichtung</p>
      <h1 id="direction-title">Wie möchtest du üben?</h1>
      <p className="page-intro">Wähle, welche Sprache zuerst gezeigt wird.</p>
      <div className="direction-picker__choices">
        <button type="button" onClick={() => onSelect('es-de')}>Spanisch → Deutsch</button>
        <button type="button" onClick={() => onSelect('de-es')}>Deutsch → Spanisch</button>
      </div>
    </section>
  );
}
