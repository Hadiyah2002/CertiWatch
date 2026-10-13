'use client';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

/**
 * Wraps react-datepicker so every date field in the app displays and
 * accepts dd/mm/yyyy, regardless of the browser's locale (a native
 * <input type="date"> can't be forced to a fixed display format — its
 * shown format always follows OS/browser locale). Internally this still
 * works with plain ISO (yyyy-mm-dd) strings in and out, since that's
 * what the Django backend expects.
 */

function parseIsoDate(iso: string): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface DateFieldProps {
  value: string; // ISO yyyy-mm-dd, or '' for empty
  onChange: (isoDate: string) => void;
  required?: boolean;
  id?: string;
}

export default function DateField({ value, onChange, required, id }: DateFieldProps) {
  return (
    <DatePicker
      id={id}
      selected={parseIsoDate(value)}
      onChange={(date: Date | null) => onChange(date ? toIsoDate(date) : '')}
      dateFormat="dd/MM/yyyy"
      placeholderText="dd/mm/yyyy"
      required={required}
      autoComplete="off"
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
      wrapperClassName="block w-full"
      showPopperArrow={false}
      popperProps={{ strategy: 'fixed' }}
    />
  );
}
