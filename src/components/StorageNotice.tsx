import { useProgress } from '../progress/ProgressProvider';

export function StorageNotice() {
  const { status } = useProgress();

  if (status.persistence !== 'memory') return null;

  return <p role="status">Dein Fortschritt kann in diesem Browser nicht gespeichert werden.</p>;
}
