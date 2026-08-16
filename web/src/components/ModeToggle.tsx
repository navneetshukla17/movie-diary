interface Props {
  mode: 'ALONE' | 'US';
  onChange: (mode: 'ALONE' | 'US') => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="mode-toggle">
      <button aria-pressed={mode === 'ALONE'} className={mode === 'ALONE' ? 'active' : ''} onClick={() => onChange('ALONE')}>Alone</button>
      <button aria-pressed={mode === 'US'} className={mode === 'US' ? 'active' : ''} onClick={() => onChange('US')}>US</button>
    </div>
  );
}
