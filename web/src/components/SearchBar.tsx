interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: Props) {
  return (
    <input
      className="search-bar"
      type="search"
      aria-label="Search all lists"
      placeholder="Search all lists…"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
