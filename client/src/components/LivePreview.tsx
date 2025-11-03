import { useEffect, useRef } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LivePreviewProps {
  html: string;
  onRefresh?: () => void;
}

export default function LivePreview({ html, onRefresh }: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { margin: 0; padding: 16px; font-family: system-ui, -apple-system, sans-serif; }
              </style>
            </head>
            <body>${html}</body>
          </html>
        `);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Live Preview
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          data-testid="button-refresh-preview"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="h-full rounded-sm border bg-white">
          <iframe
            ref={iframeRef}
            className="h-full w-full"
            title="Preview"
            data-testid="iframe-preview"
          />
        </div>
      </div>
    </div>
  );
}
