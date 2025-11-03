import { useState } from "react";
import { ChevronUp, ChevronDown, Trash2, CheckCircle, AlertTriangle, XCircle, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "success" | "warning" | "error" | "info";
  message: string;
}

interface ConversionLogProps {
  logs: LogEntry[];
  onClear: () => void;
}

export default function ConversionLog({ logs, onClear }: ConversionLogProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "success":
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case "error":
        return <XCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Circle className="h-3 w-3 text-blue-500" />;
    }
  };

  return (
    <div className="border-t">
      <div
        className="flex h-12 items-center justify-between px-4 hover-elevate cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid="button-toggle-log"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Conversion Log
          </h2>
          {logs.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              data-testid="button-clear-log"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="h-48 overflow-y-auto border-t bg-muted/20 p-4">
          {logs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No logs yet
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-3 text-xs font-mono"
                  data-testid={`log-entry-${log.level}`}
                >
                  <span className="text-muted-foreground">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  {getIcon(log.level)}
                  <span>{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
