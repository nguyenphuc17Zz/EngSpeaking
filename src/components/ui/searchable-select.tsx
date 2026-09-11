"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, ChevronDown, Check, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  group?: string;
  description?: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  allowCustom?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Chọn mô hình...",
  searchPlaceholder = "Tìm kiếm model (ví dụ: flash, llama, emma)...",
  className,
  triggerClassName,
  disabled = false,
  allowCustom = true,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Selected Option Display
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value);
  }, [options, value]);

  // Filtered Options
  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return options;

    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q);
      const matchValue = opt.value.toLowerCase().includes(q);
      const matchGroup = opt.group?.toLowerCase().includes(q);
      const matchDesc = opt.description?.toLowerCase().includes(q);
      return matchLabel || matchValue || matchGroup || matchDesc;
    });
  }, [options, searchTerm]);

  // Grouped Filtered Options
  const groupedOptions = useMemo(() => {
    const groups: { [key: string]: SearchableOption[] } = {};
    const unGrouped: SearchableOption[] = [];

    for (const opt of filteredOptions) {
      if (opt.group) {
        if (!groups[opt.group]) groups[opt.group] = [];
        groups[opt.group].push(opt);
      } else {
        unGrouped.push(opt);
      }
    }

    return { groups, unGrouped };
  }, [filteredOptions]);

  const hasExactMatch = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return options.some((opt) => opt.value.toLowerCase() === q);
  }, [options, searchTerm]);

  return (
    <div ref={containerRef} className={cn("relative w-full select-none", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full h-10 rounded-xl bg-background border border-input px-3 pr-8 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 flex items-center justify-between text-left transition-all",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-border/90",
          isOpen && "ring-2 ring-primary/40 border-primary",
          triggerClassName
        )}
      >
        <span className="truncate flex-1 font-mono">
          {selectedOption ? (
            <span>{selectedOption.label}</span>
          ) : value ? (
            <span>{value}</span>
          ) : (
            <span className="text-muted-foreground font-sans">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180 text-primary"
          )}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full min-w-[280px] rounded-2xl border border-border bg-popover/95 backdrop-blur-md shadow-xl p-2 space-y-2 animate-in fade-in-0 zoom-in-95 duration-150">
          {/* Search Header */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-8 rounded-lg bg-muted/60 border border-border/60 pl-8 pr-7 text-xs font-sans text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Stats indicator */}
          <div className="flex items-center justify-between px-1 text-[10px] text-muted-foreground font-mono">
            <span>
              {filteredOptions.length} / {options.length} models
            </span>
            {searchTerm && (
              <span className="text-primary font-sans font-medium">Lọc: "{searchTerm}"</span>
            )}
          </div>

          {/* Options Scroll List */}
          <div className="max-h-60 overflow-y-auto space-y-1 scrollbar-thin">
            {/* Custom Input Option if typed value doesn't exist */}
            {allowCustom && searchTerm.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={() => {
                  onChange(searchTerm.trim());
                  setIsOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono flex items-center justify-between gap-2 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <div className="flex items-center gap-1.5 truncate">
                  <Sparkles className="size-3 shrink-0" />
                  <span className="truncate">Sử dụng model: <strong>{searchTerm.trim()}</strong></span>
                </div>
                <span className="text-[10px] uppercase font-bold shrink-0">Custom</span>
              </button>
            )}

            {/* Ungrouped items */}
            {groupedOptions.unGrouped.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono flex items-center justify-between gap-2 transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span className="truncate flex-1">{opt.label}</span>
                  {isSelected && <Check className="size-3.5 shrink-0" />}
                </button>
              );
            })}

            {/* Grouped items */}
            {Object.entries(groupedOptions.groups).map(([groupName, groupOpts]) => (
              <div key={groupName} className="pt-1.5 first:pt-0">
                <div className="text-[10px] font-bold text-muted-foreground px-2 py-1 tracking-wider uppercase bg-muted/40 rounded-md mb-1">
                  {groupName}
                </div>
                <div className="space-y-0.5">
                  {groupOpts.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        className={cn(
                          "w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-mono flex items-center justify-between gap-2 transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        <span className="truncate flex-1">{opt.label}</span>
                        {isSelected && <Check className="size-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {filteredOptions.length === 0 && !searchTerm.trim() && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Không có models nào khả dụng
              </div>
            )}

            {filteredOptions.length === 0 && searchTerm.trim() && !allowCustom && (
              <div className="py-4 text-center text-xs text-muted-foreground">
                Không tìm thấy model nào khớp với "{searchTerm}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
