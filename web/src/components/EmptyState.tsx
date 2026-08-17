import { useMemo } from 'react';

// Retro video game & cinema themed hero icons
const RETRO_HEROES = [
  '🕹️', '👾', '🎮', '👻', '💀', '🏆', '🎯',
  '🎬', '🎥', '🎞️', '🍿', '📽️', '🎭',
  '🚀', '👽', '🛸', '☄️', '💫', '⚡',
  '🕸️', '🦇', '🔮', '🗝️', '🃏', '🪄',
];

export function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  // Pick ONE random hero icon per mount
  const hero = useMemo(() => RETRO_HEROES[Math.floor(Math.random() * RETRO_HEROES.length)], []);

  if (hasSearch) {
    return (
      <div className="empty-state">
        <div style={{ fontSize: 72, marginBottom: 12 }}>🔍</div>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-brand)', fontSize: 16 }}>
          No matches found
        </p>
      </div>
    );
  }

  return (
    <div className="empty-state">
      <div className="empty-center">
        {/* Big random retro video game character */}
        <div className="empty-hero-icon">{hero}</div>

        <h2 style={{
          fontFamily: 'var(--font-brand)',
          color: 'var(--yellow)',
          margin: '0 0 10px',
          fontSize: 22,
          textShadow: '2px 2px 0 var(--pink)',
        }}>
          Your Diary is Empty
        </h2>

        <p style={{ color: 'var(--muted)', margin: 0, fontSize: 15, lineHeight: 1.6 }}>
          Start adding movies you've watched<br />or import a list to get going!
        </p>
      </div>
    </div>
  );
}
