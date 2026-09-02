import { useProgress } from '../progress/ProgressProvider';

export function StorageNotice() {
  const { status } = useProgress();

  if (!status.warning) return null;

  return <p className="storage-notice content-container" role="status">{status.warning}</p>;
}
