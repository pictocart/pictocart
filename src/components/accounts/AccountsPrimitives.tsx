import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { useState, useEffect } from 'react';

export const inr = (n: number | string | null | undefined) =>
  '₹' + (Number(n ?? 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const MoneyInput = ({
  value, onChange, placeholder = '0.00', className,
}: { value: number | string; onChange: (n: number) => void; placeholder?: string; className?: string }) => {
  // Keep an internal string so backspace can clear to empty without snapping back to 0
  const [display, setDisplay] = useState(value === 0 || value === '' ? '' : String(value));

  // Sync when parent resets value to 0 (e.g. form reset after save)
  useEffect(() => {
    if (value === 0 || value === '') setDisplay('');
    else setDisplay(String(value));
  }, [value]);

  return (
    <Input
      type="number"
      inputMode="decimal"
      step="0.01"
      min={0}
      className={className}
      placeholder={placeholder}
      value={display}
      onChange={(e) => {
        const raw = e.target.value;
        setDisplay(raw);
        // Only propagate a real number upward; empty → 0
        onChange(raw === '' ? 0 : Number(raw));
      }}
      onBlur={() => {
        // On blur: if empty show blank (placeholder shows), if has value normalise display
        if (display === '' || display === undefined) {
          setDisplay('');
          onChange(0);
        }
      }}
    />
  );
};

export const PaymentModePicker = ({
  value, onChange, modes = ['cash', 'upi', 'card', 'bank', 'credit'],
}: { value: string; onChange: (v: string) => void; modes?: string[] }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
    <SelectContent>
      {modes.map((m) => (
        <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const DateRangePicker = ({
  from, to, onChange,
}: { from: string; to: string; onChange: (range: { from: string; to: string }) => void }) => (
  <div className="flex items-center gap-2">
    <Input type="date" value={from} onChange={(e) => onChange({ from: e.target.value, to })} className="w-auto" />
    <span className="text-muted-foreground text-sm">to</span>
    <Input type="date" value={to} onChange={(e) => onChange({ from, to: e.target.value })} className="w-auto" />
  </div>
);

export const ExportCsvButton = ({
  filename, rows, headers,
}: { filename: string; rows: Array<Record<string, any>>; headers?: string[] }) => {
  const handle = () => {
    if (!rows.length) return;
    const keys = headers ?? Object.keys(rows[0]);
    const escape = (v: any) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={!rows.length}>
      <Download className="h-4 w-4 mr-1" /> Export CSV
    </Button>
  );
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const daysAgoISO = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
