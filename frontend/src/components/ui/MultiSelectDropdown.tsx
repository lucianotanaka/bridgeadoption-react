import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
}

/**
 * A closed, select-like dropdown that supports multiple selection via
 * checkboxes. Visually behaves like a native <select> (single box, opens
 * a panel on click) but allows selecting multiple values, similar to
 * MultiSelect used in TaskReportsTab.
 */
export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));

  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((s) => s !== val));
    else onChange([...selected, val]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1 block">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-left px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
      >
        {selected.length > 0 ? (
          <span className="flex flex-wrap gap-1 overflow-hidden">
            {selected.slice(0, 2).map((s) => (
              <span key={s} className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                {s.length > 16 ? s.slice(0, 16) + "…" : s}
              </span>
            ))}
            {selected.length > 2 && <span className="text-xs text-gray-500 dark:text-gray-400">+{selected.length - 2}</span>}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 truncate">{placeholder ?? "Select..."}</span>
        )}
        <ChevronDown size={14} className="text-gray-400 shrink-0 ml-1" />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-56 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 dark:border-gray-800">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full text-xs px-2 py-1.5 border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No options</p>
            ) : (
              filtered.map((opt) => (
                <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                  <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} className="w-3.5 h-3.5 accent-blue-600" />
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{opt}</span>
                </label>
              ))
            )}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex items-center justify-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 py-1.5 border-t border-gray-100 dark:border-gray-800 transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
