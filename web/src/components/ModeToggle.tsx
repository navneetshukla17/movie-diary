interface Props {
  mode: 'ALONE' | 'US';
  onChange: (mode: 'ALONE' | 'US') => void;
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="mode-toggle">
      <button className={mode === 'ALONE' ? 'active' : ''} onClick={() => onChange('ALONE')}>Alone</button>
      <button className={mode === 'US' ? 'active' : ''} onClick={() => onChange('US')}>US</button>
    </div>
  );
}
