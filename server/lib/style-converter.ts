import type { ParsedElement, PPTXElement, PPTXStyles } from "@shared/conversion-types";

export class StyleConverter {
  convertStyles(parsedElement: ParsedElement, pptxElement: PPTXElement): void {
    const styles: PPTXStyles = {};

    // Background color / fill
    if (parsedElement.styles.backgroundColor) {
      const bgColor = this.convertColor(parsedElement.styles.backgroundColor);
      if (bgColor && bgColor !== "transparent") {
        styles.fill = bgColor;
      }
    }

    // Text color
    if (parsedElement.styles.color) {
      styles.color = this.convertColor(parsedElement.styles.color);
    }

    // Font properties
    if (parsedElement.styles.fontSize) {
      styles.fontSize = this.convertFontSize(parsedElement.styles.fontSize);
    }

    if (parsedElement.styles.fontFamily) {
      styles.fontFace = this.convertFontFamily(parsedElement.styles.fontFamily);
    }

    if (parsedElement.styles.fontWeight) {
      styles.bold = this.isBold(parsedElement.styles.fontWeight);
    }

    if (parsedElement.styles.fontStyle === "italic") {
      styles.italic = true;
    }

    // Text alignment
    if (parsedElement.styles.textAlign) {
      styles.align = this.convertTextAlign(parsedElement.styles.textAlign);
    }

    // Borders
    if (parsedElement.styles.borderWidth && parsedElement.styles.borderStyle && parsedElement.styles.borderStyle !== "none") {
      const borderColor = parsedElement.styles.borderColor || "#000000";
      styles.line = {
        color: this.convertColor(borderColor) || "#000000",
        width: this.convertBorderWidth(parsedElement.styles.borderWidth),
        dashType: this.convertBorderStyle(parsedElement.styles.borderStyle),
      };
    }

    // Opacity
    if (parsedElement.styles.opacity) {
      const opacity = parseFloat(parsedElement.styles.opacity);
      if (opacity < 1) {
        styles.fillOpacity = opacity;
      }
    }

    pptxElement.styles = styles;
  }

  private convertColor(cssColor: string): string | undefined {
    if (!cssColor || cssColor === "transparent" || cssColor === "rgba(0, 0, 0, 0)") {
      return undefined;
    }

    // Handle rgb/rgba
    const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      return this.rgbToHex(r, g, b);
    }

    // Handle hex colors
    if (cssColor.startsWith("#")) {
      return cssColor.substring(1).toUpperCase();
    }

    // Handle named colors - simplified mapping
    const namedColors: Record<string, string> = {
      black: "000000",
      white: "FFFFFF",
      red: "FF0000",
      green: "00FF00",
      blue: "0000FF",
      yellow: "FFFF00",
      cyan: "00FFFF",
      magenta: "FF00FF",
    };

    return namedColors[cssColor.toLowerCase()];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = n.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return (toHex(r) + toHex(g) + toHex(b)).toUpperCase();
  }

  private convertFontSize(fontSize: string): number {
    // Convert CSS px to PowerPoint points
    const px = parseFloat(fontSize);
    // 1 point = 1.333... pixels (approximately)
    return Math.round(px * 0.75);
  }

  private convertFontFamily(fontFamily: string): string {
    // Remove quotes and take first font
    return fontFamily.replace(/['"]/g, "").split(",")[0].trim();
  }

  private isBold(fontWeight: string): boolean {
    const weight = fontWeight.toLowerCase();
    return weight === "bold" || weight === "bolder" || parseInt(weight) >= 600;
  }

  private convertTextAlign(textAlign: string): "left" | "center" | "right" | "justify" {
    const align = textAlign.toLowerCase();
    if (align === "center" || align === "right" || align === "justify") {
      return align as "center" | "right" | "justify";
    }
    return "left";
  }

  private convertBorderWidth(borderWidth: string): number {
    const px = parseFloat(borderWidth);
    // Convert pixels to points
    return Math.max(1, Math.round(px * 0.75));
  }

  private convertBorderStyle(
    borderStyle: string
  ): "solid" | "dash" | "dot" {
    const style = borderStyle.toLowerCase();
    if (style === "dashed") return "dash";
    if (style === "dotted") return "dot";
    return "solid";
  }
}
