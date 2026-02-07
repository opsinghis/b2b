"use client";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@b2b/ui";
import { Check, Copy, AlertCircle } from "lucide-react";
import * as React from "react";

interface ConfigEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function ConfigEditor({ value, onChange, disabled, error }: ConfigEditorProps) {
  const [copied, setCopied] = React.useState(false);
  const [isValid, setIsValid] = React.useState(true);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    try {
      JSON.parse(value);
      setIsValid(true);
    } catch {
      setIsValid(value.trim() === "" || false);
    }
  }, [value]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // Don't format if invalid JSON
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed));
    } catch {
      // Don't minify if invalid JSON
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + "  " + value.substring(end);
      onChange(newValue);

      // Restore cursor position
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Configuration (JSON)</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleFormat}
            disabled={disabled || !isValid}
          >
            Format
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleMinify}
            disabled={disabled || !isValid}
          >
            Minify
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={disabled}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className={`min-h-[300px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${
              !isValid || error ? "border-destructive" : ""
            }`}
            placeholder='{"theme": "default", "features": []}'
            disabled={disabled}
            spellCheck={false}
          />
          {(!isValid || error) && (
            <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {error || "Invalid JSON format"}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Configure tenant-specific settings like theme, features, and integrations.
        </p>
      </CardContent>
    </Card>
  );
}
