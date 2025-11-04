import { useState } from "react";
import { ChevronUp, ChevronDown, Trash2, CheckCircle, AlertTriangle, XCircle, Circle, Code } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: "success" | "warning" | "error" | "info" | "element";
  message: string;
  elementData?: {
    id: string;
    tag: string;
    text: string;
    htmlPosition?: string;
    pptxPosition?: string;
    pptxType?: string;
    status?: "ok" | "warning" | "error";
    issue?: string;
  };
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
      case "element":
        return <Code className="h-3 w-3 text-purple-500" />;
      default:
        return <Circle className="h-3 w-3 text-blue-500" />;
    }
  };
  
  const getStatusBadge = (status?: "ok" | "warning" | "error") => {
    if (!status) return null;
    const colors = {
      ok: "text-green-600 bg-green-50",
      warning: "text-yellow-600 bg-yellow-50",
      error: "text-red-600 bg-red-50",
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${colors[status]}`}>
        {status}
      </span>
    );
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
                  className={log.level === "element" ? "border-l-2 border-purple-300 pl-2 py-1" : ""}
                  data-testid={`log-entry-${log.level}`}
                >
                  <div className="flex gap-3 text-xs font-mono">
                    <span className="text-muted-foreground">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                    {getIcon(log.level)}
                    <span className="flex-1">{log.message}</span>
                    {log.elementData && getStatusBadge(log.elementData.status)}
                  </div>
                  {log.elementData && (
                    <div className="ml-10 mt-1 space-y-1 text-[10px] text-muted-foreground">
                      {log.elementData.text && (
                        <div>📝 Текст: <span className="text-foreground">{log.elementData.text}</span></div>
                      )}
                      {log.elementData.htmlPosition && (
                        <div>📍 HTML: <span className="text-foreground font-mono">{log.elementData.htmlPosition}</span></div>
                      )}
                      {log.elementData.pptxPosition && (
                        <div>🎯 PPTX: <span className="text-foreground font-mono">{log.elementData.pptxPosition}</span></div>
                      )}
                      {log.elementData.issue && (
                        <div className="text-yellow-600">⚠️ {log.elementData.issue}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
