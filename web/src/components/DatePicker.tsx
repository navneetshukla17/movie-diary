import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  id?: string;
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePicker({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open && buttonRef.current) {
      setRect(buttonRef.current.getBoundingClientRect());
    }
  }, [open]);

  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  const selectedDate = value ? new Date(value) : null;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrev = () => setViewDate(new Date(year, month - 1, 1));
  const handleNext = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelect = (d: number) => {
    const dStr = String(d).padStart(2, '0');
    const mStr = String(month + 1).padStart(2, '0');
    onChange(`${year}-${mStr}-${dStr}`);
    setOpen(false);
  };

  const renderGrid = () => {
    const cells = [];
    // Previous month filler
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      cells.push(<div key={`prev-${i}`} style={{ color: 'var(--muted)', opacity: 0.5, padding: '4px' }}>{daysInPrevMonth - i}</div>);
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected = selectedDate && selectedDate.getDate() === i && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
      const isToday = new Date().getDate() === i && new Date().getMonth() === month && new Date().getFullYear() === year;
      
      cells.push(
        <button
          key={`day-${i}`}
          type="button"
          onClick={() => handleSelect(i)}
          style={{
            background: isSelected ? 'var(--cyan)' : 'transparent',
            color: isSelected ? '#1a1033' : (isToday ? 'var(--pink)' : 'var(--text)'),
            border: isSelected ? '2px solid var(--cyan)' : (isToday ? '2px solid var(--pink)' : '2px solid transparent'),
            borderRadius: '6px',
            padding: '4px',
            cursor: 'pointer',
            fontWeight: isSelected || isToday ? 'bold' : 'normal',
            boxShadow: 'none',
          }}
        >
          {i}
        </button>
      );
    }
    return cells;
  };

  const displayDate = value ? (() => {
    // Treat as local time by parsing YYYY-MM-DD manually to avoid timezone shifting
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return `${String(d).padStart(2, '0')} / ${MONTHS[m]} / ${y}`;
  })() : 'dd / mm / yyyy';

  return (
    <div style={{ position: 'relative', width: '100%', flex: 1, margin: 0 }}>
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#130b28',
          border: '2px solid var(--muted)',
          padding: '10px 12px',
          color: value ? 'var(--text)' : 'var(--muted)',
          boxShadow: 'none',
          margin: 0
        }}
      >
        <span>{displayDate}</span>
        <Calendar size={18} color={value ? 'var(--cyan)' : 'var(--muted)'} />
      </button>

      {open && rect && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed', 
            ...(window.innerHeight - rect.bottom < 360 && rect.top > window.innerHeight - rect.bottom
              ? { bottom: window.innerHeight - rect.top + 8 }
              : { top: rect.bottom + 8 }
            ),
            left: rect.left,
            background: 'var(--bg-2)', border: '2px solid var(--pink)', borderRadius: '12px',
            padding: '16px', zIndex: 9999, boxShadow: 'var(--shadow)', width: Math.max(260, rect.width)
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <button type="button" onClick={handlePrev} style={{ padding: '4px', boxShadow: 'none' }}><ChevronLeft size={18} /></button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <select 
                  value={month}
                  onChange={(e) => setViewDate(new Date(year, parseInt(e.target.value, 10), 1))}
                  style={{ 
                    background: 'var(--bg)', 
                    color: 'var(--yellow)', 
                    border: '2px solid var(--muted)',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    fontFamily: 'inherit',
                    outline: 'none',
                    margin: 0,
                    padding: '2px 4px',
                    cursor: 'pointer',
                  }}
                >
                  {MONTHS.map((m, idx) => <option key={m} value={idx} style={{ color: '#000' }}>{m}</option>)}
                </select>
                
                <select 
                  value={year}
                  onChange={(e) => setViewDate(new Date(parseInt(e.target.value, 10), month, 1))}
                  style={{ 
                    background: 'var(--bg)', 
                    color: 'var(--yellow)', 
                    border: '2px solid var(--muted)',
                    borderRadius: '6px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    fontFamily: 'inherit',
                    outline: 'none',
                    margin: 0,
                    padding: '2px 4px',
                    cursor: 'pointer',
                  }}
                >
                  {Array.from({ length: 150 }, (_, i) => {
                    const y = new Date().getFullYear() - 100 + i;
                    return <option key={y} value={y} style={{ color: '#000' }}>{y}</option>;
                  })}
                </select>
              </div>

              <button type="button" onClick={handleNext} style={{ padding: '4px', boxShadow: 'none' }}><ChevronRight size={18} /></button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '14px', marginBottom: '8px' }}>
              {DAYS.map(d => <strong key={d} style={{ color: 'var(--muted)' }}>{d}</strong>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', fontSize: '14px' }}>
              {renderGrid()}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px' }}>
              <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="mini-btn" style={{ background: 'transparent' }}>Clear</button>
              <button type="button" onClick={() => { 
                const n = new Date();
                onChange(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`);
                setOpen(false);
              }} className="mini-btn primary">Today</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
