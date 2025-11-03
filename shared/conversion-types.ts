import { z } from "zod";

// Conversion request from frontend
export const conversionOptionsSchema = z.object({
  slideWidth: z.number().optional().default(10),
  slideHeight: z.number().optional().default(7.5),
  preserveImages: z.boolean().optional().default(true),
  optimizeShapes: z.boolean().optional().default(true),
  mergeTextBoxes: z.boolean().optional().default(false),
});

export type ConversionOptions = z.infer<typeof conversionOptionsSchema>;

export const conversionRequestSchema = z.object({
  html: z.string().min(1, "HTML content is required"),
  options: conversionOptionsSchema.optional(),
});

export type ConversionRequest = z.infer<typeof conversionRequestSchema>;

// Element classification
export interface ParsedElement {
  id: string;
  tagName: string;
  textContent: string;
  styles: ComputedStyles;
  position: ElementPosition;
  children: ParsedElement[];
}

export interface ComputedStyles {
  backgroundColor?: string;
  color?: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  width?: string;
  height?: string;
  borderRadius?: string;
  borderWidth?: string;
  borderStyle?: string;
  borderColor?: string;
  padding?: string;
  margin?: string;
  display?: string;
  position?: string;
  top?: string;
  left?: string;
  transform?: string;
  opacity?: string;
}

export interface ElementPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// PowerPoint element types
export type PPTXShapeType =
  | "rect"
  | "roundRect"
  | "ellipse"
  | "triangle"
  | "line"
  | "text";

export interface PPTXElement {
  id: string;
  type: PPTXShapeType;
  position: ElementPosition;
  styles: PPTXStyles;
  text?: string;
  children?: PPTXElement[];
}

export interface PPTXStyles {
  fill?: string;
  fillOpacity?: number;
  line?: {
    color: string;
    width: number;
    dashType?: "solid" | "dash" | "dot";
  };
  fontFace?: string;
  fontSize?: number;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
  valign?: "top" | "middle" | "bottom";
}

// Conversion log
export interface ConversionLog {
  level: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: Date;
}
