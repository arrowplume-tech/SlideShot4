import type { ParsedElement, PPTXElement, PPTXStyles } from "@shared/conversion-types";

export class StyleConverter {
  convertStyles(parsedElement: ParsedElement, pptxElement: PPTXElement): void {
    const styles: PPTXStyles = {};

    console.log(`[StyleConverter] Converting styles for ${parsedElement.id} <${parsedElement.tagName}>`);

    // Background color / fill (including gradients)
    if (parsedElement.styles.backgroundColor) {
      // Check if it's a gradient
      if (this.isGradient(parsedElement.styles.backgroundColor)) {
        const gradientStr = parsedElement.styles.backgroundColor.substring(0, 80);
        console.log(`  → Gradient detected: ${gradientStr}...`);
        styles.fill = this.convertGradient(parsedElement.styles.backgroundColor);
        console.log(`  → Converted to PowerPoint gradient: ${styles.fill}`);
      } else {
        const bgColor = this.convertColor(parsedElement.styles.backgroundColor);
        if (bgColor && bgColor !== "transparent") {
          styles.fill = bgColor;
          console.log(`  → Background color: ${parsedElement.styles.backgroundColor} → #${bgColor}`);
        }
      }
    }

    // Text color
    if (parsedElement.styles.color) {
      styles.color = this.convertColor(parsedElement.styles.color);
    }

    // Font properties
    if (parsedElement.styles.fontSize) {
      const originalSize = parsedElement.styles.fontSize;
      styles.fontSize = this.convertFontSize(originalSize);
      console.log(`  → Font size: ${originalSize} → ${styles.fontSize}pt`);
    }

    if (parsedElement.styles.fontFamily) {
      const originalFont = parsedElement.styles.fontFamily;
      styles.fontFace = this.convertFontFamily(originalFont);
      console.log(`  → Font family: ${originalFont} → ${styles.fontFace}`);
    }

    if (parsedElement.styles.fontWeight) {
      styles.bold = this.isBold(parsedElement.styles.fontWeight);
      if (styles.bold) {
        console.log(`  → Font weight: ${parsedElement.styles.fontWeight} → bold`);
      }
    }

    if (parsedElement.styles.fontStyle === "italic") {
      styles.italic = true;
      console.log(`  → Font style: italic`);
    }

    // Text alignment
    if (parsedElement.styles.textAlign) {
      styles.align = this.convertTextAlign(parsedElement.styles.textAlign);
      console.log(`  → Text align: ${parsedElement.styles.textAlign} → ${styles.align}`);
    }

    // Borders - check if all 4 sides have the same border
    const hasBorder = this.hasUniformBorder(parsedElement.styles);
    if (hasBorder) {
      const borderColor = parsedElement.styles.borderColor || parsedElement.styles.borderTopColor || "#000000";
      styles.line = {
        color: this.convertColor(borderColor) || "000000",
        width: this.convertBorderWidth(parsedElement.styles.borderTopWidth || parsedElement.styles.borderWidth || "1px"),
        dashType: this.convertBorderStyle(parsedElement.styles.borderTopStyle || parsedElement.styles.borderStyle || "solid"),
      };
      console.log(`  → Border: ${parsedElement.styles.borderWidth} ${parsedElement.styles.borderStyle} ${borderColor} → ${styles.line.width}pt ${styles.line.dashType} #${styles.line.color}`);
    } else {
      // Check for single-sided borders (border-bottom, border-left, etc.)
      const singleSidedBorders = this.extractSingleSidedBorders(parsedElement);
      if (singleSidedBorders.length > 0) {
        styles.singleSidedBorders = singleSidedBorders;
        console.log(`  → Single-sided borders detected: ${singleSidedBorders.map(b => b.side).join(', ')}`);
      } else {
        console.log(`  → Skipping non-uniform borders (e.g., border-bottom only)`);
      }
    }

    // Opacity
    if (parsedElement.styles.opacity) {
      const opacity = parseFloat(parsedElement.styles.opacity);
      if (opacity < 1) {
        styles.fillOpacity = opacity;
        console.log(`  → Opacity: ${opacity}`);
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

  private extractSingleSidedBorders(parsedElement: ParsedElement): Array<{
    side: "top" | "right" | "bottom" | "left";
    color: string;
    width: number;
    dashType: "solid" | "dash" | "dot";
    elementPosition: any;
  }> {
    const borders: Array<{
      side: "top" | "right" | "bottom" | "left";
      color: string;
      width: number;
      dashType: "solid" | "dash" | "dot";
      elementPosition: any;
    }> = [];
    const { styles, position } = parsedElement;
    
    const checkBorder = (side: "top" | "right" | "bottom" | "left") => {
      let width: string | undefined;
      let color: string | undefined;
      let style: string | undefined;
      
      if (side === "top") {
        width = styles.borderTopWidth;
        color = styles.borderTopColor;
        style = styles.borderTopStyle;
      } else if (side === "right") {
        width = styles.borderRightWidth;
        color = styles.borderRightColor;
        style = styles.borderRightStyle;
      } else if (side === "bottom") {
        width = styles.borderBottomWidth;
        color = styles.borderBottomColor;
        style = styles.borderBottomStyle;
      } else {
        width = styles.borderLeftWidth;
        color = styles.borderLeftColor;
        style = styles.borderLeftStyle;
      }
      
      if (width && parseFloat(width) > 0 && style && style !== "none" && color) {
        const convertedColor = this.convertColor(color);
        if (convertedColor) {
          borders.push({
            side,
            color: convertedColor,
            width: this.convertBorderWidth(width),
            dashType: this.convertBorderStyle(style),
            elementPosition: position, // Need this to calculate line coordinates
          });
        }
      }
    };
    
    checkBorder("top");
    checkBorder("right");
    checkBorder("bottom");
    checkBorder("left");
    
    return borders;
  }

  private hasUniformBorder(styles: any): boolean {
    const top = {
      width: styles.borderTopWidth,
      style: styles.borderTopStyle,
      color: styles.borderTopColor,
    };
    const right = {
      width: styles.borderRightWidth,
      style: styles.borderRightStyle,
      color: styles.borderRightColor,
    };
    const bottom = {
      width: styles.borderBottomWidth,
      style: styles.borderBottomStyle,
      color: styles.borderBottomColor,
    };
    const left = {
      width: styles.borderLeftWidth,
      style: styles.borderLeftStyle,
      color: styles.borderLeftColor,
    };

    const hasTopBorder = top.width && parseFloat(top.width) > 0 && top.style && top.style !== "none";
    const hasRightBorder = right.width && parseFloat(right.width) > 0 && right.style && right.style !== "none";
    const hasBottomBorder = bottom.width && parseFloat(bottom.width) > 0 && bottom.style && bottom.style !== "none";
    const hasLeftBorder = left.width && parseFloat(left.width) > 0 && left.style && left.style !== "none";

    if (!hasTopBorder && !hasRightBorder && !hasBottomBorder && !hasLeftBorder) {
      return false;
    }

    const allSidesHaveBorder = hasTopBorder && hasRightBorder && hasBottomBorder && hasLeftBorder;
    
    if (!allSidesHaveBorder) {
      return false;
    }

    const sameWidth = top.width === right.width && right.width === bottom.width && bottom.width === left.width;
    const sameStyle = top.style === right.style && right.style === bottom.style && bottom.style === left.style;
    const sameColor = top.color === right.color && right.color === bottom.color && bottom.color === left.color;

    return sameWidth && sameStyle && sameColor;
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
