import React, { useState, useEffect, useRef } from 'react';
import { Check, Edit2, Loader2 } from 'lucide-react';

interface EditableCellProps {
  value: string | number;
  type?: 'text' | 'number' | 'select' | 'date';
  options?: Array<{ label: string; value: string }>;
  onSave: (newValue: any) => Promise<void>;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
  badgeColors?: Record<string, string>;
}

export const EditableCell: React.FC<EditableCellProps> = ({
  value,
  type = 'text',
  options = [],
  onSave,
  placeholder = 'Click to edit',
  prefix,
  suffix,
  className = '',
  badgeColors,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState<string | number>(value);
  const [isLoading, setIsLoading] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }

    try {
      setIsLoading(true);
      let parsedValue: any = currentValue;
      if (type === 'number') {
        parsedValue = parseFloat(String(currentValue)) || 0;
      }
      await onSave(parsedValue);
      setIsEditing(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save inline edit', error);
      setCurrentValue(value); // Rollback on error
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    if (type === 'select') {
      return (
        <div className="relative inline-flex items-center">
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="px-2.5 py-1 text-xs font-medium rounded-md border-2 border-pharmacy-teal-500 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-400"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-pharmacy-teal-600 ml-1.5" />}
        </div>
      );
    }

    return (
      <div className="relative inline-flex items-center w-full min-w-[80px]">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={currentValue}
          onChange={(e) => setCurrentValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="w-full px-2 py-1 text-sm rounded-md border-2 border-pharmacy-teal-500 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pharmacy-teal-400"
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-pharmacy-teal-600" />
          </div>
        )}
      </div>
    );
  }

  // Display badge if badgeColors provided (e.g. for status: PAID / PENDING / COMPLETED)
  const isBadge = badgeColors && badgeColors[String(value)];
  const badgeClass = isBadge ? badgeColors[String(value)] : '';

  return (
    <div
      onClick={() => setIsEditing(true)}
      title="Click to inline edit"
      className={`group relative inline-flex items-center gap-1.5 cursor-pointer rounded px-2 py-1 transition-all duration-150 hover:bg-teal-50/70 hover:ring-1 hover:ring-pharmacy-teal-300 ${className} ${
        justSaved ? 'bg-emerald-50 ring-1 ring-emerald-400' : ''
      }`}
    >
      {isBadge ? (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeClass}`}>
          {String(value)}
        </span>
      ) : (
        <span className="truncate">
          {prefix}
          {value !== null && value !== undefined && String(value).trim() !== '' ? String(value) : (
            <span className="text-slate-400 italic text-xs">{placeholder}</span>
          )}
          {suffix}
        </span>
      )}

      {justSaved ? (
        <Check className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
      ) : (
        <Edit2 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </div>
  );
};
