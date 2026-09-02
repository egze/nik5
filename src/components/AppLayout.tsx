import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { StorageNotice } from './StorageNotice';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="app-layout">
      <header className="site-header">
        <div className="content-container site-header__content">
          <Link className="brand" to="/">Lernraum</Link>
          <Link className="header-link" to="/">Fächer</Link>
        </div>
      </header>
      <StorageNotice />
      <main className="content-container page-content">
        {children}
      </main>
    </div>
  );
}
