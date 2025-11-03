import type { ConversionOptions } from "@shared/conversion-types";

export interface ConversionResult {
  success: boolean;
  logs: Array<{
    level: "info" | "success" | "warning" | "error";
    message: string;
    timestamp: string;
  }>;
  filename: string;
  file: string; // base64 encoded
}

export async function convertHtmlToPptx(
  html: string,
  options?: ConversionOptions
): Promise<ConversionResult> {
  const response = await fetch("/api/convert", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ html, options }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Conversion failed" }));
    throw new Error(error.error || error.details || "Conversion failed");
  }

  return response.json();
}

export function base64ToBlob(base64: string): Blob {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
