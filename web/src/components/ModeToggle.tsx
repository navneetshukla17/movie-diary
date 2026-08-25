import type { Mode } from '../api/client';

interface Props {
  mode: Mode;
  person1Name?: string;
  person2Name?: string;
  onChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, person1Name = 'Me', person2Name = 'Partner', onChange }: Props) {
  return (
    <div className="mode-toggle">
      <button aria-pressed={mode === 'ALONE'} className={mode === 'ALONE' ? 'active' : ''} onClick={() => onChange('ALONE')}>{person1Name}</button>
      <button aria-pressed={mode === 'PARTNER'} className={mode === 'PARTNER' ? 'active' : ''} onClick={() => onChange('PARTNER')}>{person2Name}</button>
      <button aria-pressed={mode === 'US'} className={mode === 'US' ? 'active' : ''} onClick={() => onChange('US')}>US</button>
    </div>
  );
}
