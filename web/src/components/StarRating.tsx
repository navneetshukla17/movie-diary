import { useState } from 'react';
import { Star } from 'lucide-react';

interface Props {
  rating: number | null;
  onChange: (rating: number | null) => void;
}

export function StarRating({ rating, onChange }: Props) {
  const [hover, setHover] = useState<number | null>(null);

  const current = hover !== null ? hover : (rating ?? 0);

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(null)}
          onClick={() => onChange(rating === star ? null : star)}
          style={{
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            cursor: 'pointer',
            color: star <= current ? 'var(--yellow)' : 'var(--muted)',
            transition: 'color 0.2s',
            transform: 'none', // Override global button active scale
          }}
        >
          <Star size={32} fill={star <= current ? 'currentColor' : 'none'} style={{ filter: star <= current ? 'drop-shadow(0 0 8px rgba(252, 200, 62, 0.4))' : 'none' }} />
        </button>
      ))}
      <span style={{ fontSize: '13px', color: 'var(--muted)', marginLeft: '8px' }}>
        {rating ? `${rating} / 5` : 'Not rated'}
      </span>
    </div>
  );
}
