import { useState } from "react";
import ConversionLog, { LogEntry } from "../ConversionLog";

export default function ConversionLogExample() {
  const [logs] = useState<LogEntry[]>([
    {
      id: "1",
      timestamp: new Date(),
      level: "info",
      message: "Starting HTML parsing...",
    },
    {
      id: "2",
      timestamp: new Date(),
      level: "success",
      message: "Detected 3 elements: 1 roundRect, 2 text",
    },
    {
      id: "3",
      timestamp: new Date(),
      level: "warning",
      message: "Complex gradient detected, using fallback",
    },
    {
      id: "4",
      timestamp: new Date(),
      level: "success",
      message: "PowerPoint generation complete",
    },
  ]);

  return <ConversionLog logs={logs} onClear={() => console.log("Clear logs")} />;
}
