import { useState } from "react";
import { Code2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

export default function CodeEditor({ value, onChange, onClear }: CodeEditorProps) {
  const [fontSize, setFontSize] = useState(14);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          HTML/CSS Editor
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="h-9 rounded-md border bg-background px-3 text-sm"
            data-testid="select-font-size"
          >
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            data-testid="button-clear-editor"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-full w-full resize-none bg-background p-4 font-mono text-sm leading-relaxed focus:outline-none"
          style={{ fontSize: `${fontSize}px` }}
          placeholder="Enter HTML/CSS here..."
          data-testid="textarea-code-editor"
        />
      </div>
    </div>
  );
}
