import { useEffect, useState, useMemo } from 'react';

interface Props {
  active: boolean;
  type: 'first_movie' | 'import';
  count?: number;
  onDone: () => void;
}

interface Sparkle {
  id: number;
  icon: string;
  left: number; // percentage
  size: number;
  delay: number;
  duration: number;
  color: string;
}

const SPARKLE_ICONS = ['⭐', '✨', '🌟', '💫', '🎬', '🍿'];
const SPARKLE_COLORS = ['#ffd166', '#ff6ac1', '#67e8f9', '#4ade80'];

export function NeonMarqueeCelebration({ active, type, count = 1, onDone }: Props) {
  const [visible, setVisible] = useState(false);

  const sparkles = useMemo<Sparkle[]>(() => {
    return Array.from({ length: 16 }, (_, i) => ({
      id: i,
      icon: SPARKLE_ICONS[i % SPARKLE_ICONS.length],
      left: 10 + (i * 5.2) % 80,
      size: 16 + (i * 3) % 18,
      delay: (i * 0.12) % 0.8,
      duration: 1.8 + (i * 0.15) % 1.2,
      color: SPARKLE_COLORS[i % SPARKLE_COLORS.length],
    }));
  }, []);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
      onDone();
    }, 2800);

    return () => clearTimeout(timer);
  }, [active]);

  if (!active && !visible) return null;

  return (
    <div className={`marquee-celebration-container ${visible ? 'active' : 'closing'}`} aria-hidden="true">
      {/* Warm floating star particles drifting upwards */}
      <div className="marquee-sparkles-wrap">
        {sparkles.map((s) => (
          <span
            key={s.id}
            className="marquee-sparkle"
            style={{
              left: `${s.left}%`,
              fontSize: `${s.size}px`,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.duration}s`,
              color: s.color,
            }}
          >
            {s.icon}
          </span>
        ))}
      </div>

      {/* Floating retro neon announcement banner below top marquee */}
      <div className="marquee-banner-card">
        <div className="marquee-banner-badge">
          {type === 'first_movie' ? '🎬 FIRST FILM LOGGED!' : `📥 ${count} MOVIES IMPORTED!`}
        </div>
        <div className="marquee-banner-sub">
          {type === 'first_movie'
            ? '✨ Your movie diary journey has begun! 🍿'
            : '✨ Your collection has been added to your diary! 🌟'}
        </div>
      </div>
    </div>
  );
}
