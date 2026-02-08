"use client";

import { Input } from "@b2b/ui";
import { Package, Search, Tag, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useSearchSuggestions } from "../hooks";

interface ProductSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
}

export function ProductSearch({
  value,
  onChange,
  onSearch,
  placeholder = "Search products...",
}: ProductSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  const { data: suggestions, isLoading } = useSearchSuggestions(debouncedValue);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setIsOpen(true);
    },
    [onChange]
  );

  const handleInputFocus = useCallback(() => {
    if (value.length >= 2) {
      setIsOpen(true);
    }
  }, [value]);

  const handleSuggestionClick = useCallback(
    (text: string) => {
      onChange(text);
      setIsOpen(false);
      onSearch?.(text);
    },
    [onChange, onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setIsOpen(false);
        onSearch?.(value);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [onSearch, value]
  );

  const handleClear = useCallback(() => {
    onChange("");
    setIsOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  const hasSuggestions =
    suggestions?.suggestions && suggestions.suggestions.length > 0;
  const showDropdown = isOpen && value.length >= 2;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Searching...
            </div>
          ) : hasSuggestions ? (
            <ul className="py-1 max-h-80 overflow-auto">
              {suggestions.suggestions.map((suggestion, index) => (
                <li key={`${suggestion.text}-${index}`}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion.text)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent text-left"
                  >
                    <SuggestionIcon type={suggestion.type} />
                    <span className="flex-1 truncate">{suggestion.text}</span>
                    {suggestion.count !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        ({suggestion.count})
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No suggestions found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SuggestionIcon({ type }: { type: Record<string, never> }) {
  // Type is a Record but usually represents string types like "product", "category", "brand"
  const typeStr = String(type) || "product";

  switch (typeStr) {
    case "category":
      return <Tag className="h-4 w-4 text-muted-foreground" />;
    case "product":
    default:
      return <Package className="h-4 w-4 text-muted-foreground" />;
  }
}
