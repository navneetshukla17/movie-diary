import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, placeholder = 'Search movies & TV shows…', onChange }: Props) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Search size={20} style={{ position: 'absolute', left: '16px', color: 'var(--muted)' }} />
      <input
        className="search-bar"
        type="search"
        aria-label="Search diary"
        placeholder={placeholder}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ paddingLeft: '48px', paddingRight: '48px', margin: 0, borderRadius: '16px', height: '48px' }}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          style={{
            position: 'absolute',
            right: '4px',
            width: '40px',
            height: '40px',
            background: 'none',
            border: 'none',
            boxShadow: 'none',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--danger)',
            cursor: 'pointer'
          }}
        >
          <X size={24} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
