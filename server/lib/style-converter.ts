import type { ParsedElement, PPTXElement, PPTXStyles } from "@shared/conversion-types";

export class StyleConverter {
  convertStyles(parsedElement: ParsedElement, pptxElement: PPTXElement): void {
    const styles: PPTXStyles = {};

    // Background color / fill (including gradients)
    if (parsedElement.styles.backgroundColor) {
      // Check if it's a gradient
      if (this.isGradient(parsedElement.styles.backgroundColor)) {
        console.log(`[StyleConverter] Gradient detected: ${parsedElement.styles.backgroundColor}`);
        styles.fill = this.convertGradient(parsedElement.styles.backgroundColor);
      } else {
        const bgColor = this.convertColor(parsedElement.styles.backgroundColor);
        if (bgColor && bgColor !== "transparent") {
          styles.fill = bgColor;
        }
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

  private isGradient(cssValue: string): boolean {
    return cssValue.includes("gradient(");
  }

  private convertGradient(cssGradient: string): any {
    console.log(`[StyleConverter] Converting gradient: ${cssGradient}`);
    
    // Extract gradient type
    const isLinear = cssGradient.includes("linear-gradient");
    const isRadial = cssGradient.includes("radial-gradient");
    
    if (!isLinear && !isRadial) {
      console.warn(`[StyleConverter] Unknown gradient type, defaulting to color`);
      return undefined;
    }

    // Extract colors from gradient
    const colors = this.extractGradientColors(cssGradient);
    if (colors.length === 0) {
      console.warn(`[StyleConverter] No colors found in gradient`);
      return undefined;
    }

    // Extract angle for linear gradient
    let angle = 0;
    if (isLinear) {
      angle = this.extractGradientAngle(cssGradient);
    }

    console.log(`[StyleConverter] Gradient processed: ${colors.length} colors, angle: ${angle}°`);

    // PowerPoint gradient format
    return {
      type: "gradient",
      colors: colors.map((color, index) => ({
        color: this.convertColor(color) || "000000",
        position: (index / (colors.length - 1)) * 100,
      })),
      angle: angle,
    };
  }

  private extractGradientColors(gradient: string): string[] {
    // Extract colors from gradient string
    // Matches: rgb(r,g,b), rgba(r,g,b,a), #hex, named colors
    const colorRegex = /(rgba?\([^)]+\)|#[a-fA-F0-9]{3,8}|\b(?:red|blue|green|yellow|white|black|purple|orange|pink|gray|grey)\b)(?:\s+\d+%)?/gi;
    const matches = gradient.match(colorRegex) || [];
    
    // Extract just the color part, removing percentage
    return matches.map(match => {
      const colorOnly = match.split(/\s+/)[0];
      return colorOnly;
    }).filter(Boolean);
  }

  private extractGradientAngle(gradient: string): number {
    // Try to extract angle in degrees
    const degMatch = gradient.match(/(\d+)deg/);
    if (degMatch) {
      return parseInt(degMatch[1]);
    }

    // Handle named directions
    if (gradient.includes("to right")) return 90;
    if (gradient.includes("to left")) return 270;
    if (gradient.includes("to bottom")) return 180;
    if (gradient.includes("to top")) return 0;
    if (gradient.includes("to bottom right")) return 135;
    if (gradient.includes("to bottom left")) return 225;
    if (gradient.includes("to top right")) return 45;
    if (gradient.includes("to top left")) return 315;

    // Default angle
    return 0;
  }
}
