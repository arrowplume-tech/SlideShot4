import type { ParsedElement, PPTXElement, PPTXShapeType } from "@shared/conversion-types";

export class ElementClassifier {
  classify(elements: ParsedElement[]): PPTXElement[] {
    return elements.map((el) => this.classifyElement(el));
  }

  private classifyElement(element: ParsedElement): PPTXElement {
    const shapeType = this.determineShapeType(element);
    const hasText = element.textContent.trim().length > 0 || element.tagName.match(/^(h[1-6]|p|span|a|button|label)$/);

    const pptxElement: PPTXElement = {
      id: element.id,
      type: shapeType,
      position: element.position,
      styles: {},
      text: hasText ? element.textContent : undefined,
      children: element.children.length > 0 ? this.classify(element.children) : undefined,
    };

    // Log classification decision with detailed info
    const textWarning = hasText && shapeType !== "text" ? " ⚠️ TEXT WILL BE LOST!" : "";
    const textPreview = hasText ? element.textContent.substring(0, 40) : "(no text)";
    const reason = this.getClassificationReason(element, shapeType);
    
    console.log(`[Classifier] ${element.id} <${element.tagName}> → ${shapeType}${textWarning} { text: "${textPreview}", reason: '${reason}' }`);
    
    // Additional detailed logging for roundRect (potential полуовалы!)
    if (shapeType === "roundRect") {
      const pos = element.position;
      const borderRadius = element.styles.borderRadius || "0px";
      console.log(`  → roundRect details: position=(${pos.x.toFixed(2)}", ${pos.y.toFixed(2)}", ${pos.width.toFixed(2)}", ${pos.height.toFixed(2)}"), borderRadius=${borderRadius}, bg=${element.styles.backgroundColor}`);
      
      if (pos.width > 15 || pos.height > 10) {
        console.warn(`  → ⚠️ HUGE roundRect! This might be a decorative wrapper that should be filtered out!`);
      }
    }

    return pptxElement;
  }

  private determineShapeType(element: ParsedElement): PPTXShapeType {
    const { styles, tagName } = element;

    // Text elements
    if (tagName.match(/^(h[1-6]|p|span|a|label)$/)) {
      return "text";
    }

    // Horizontal rule -> line
    if (tagName === "hr") {
      return "line";
    }

    // Check for circle (border-radius: 50% with equal width/height)
    if (this.isCircle(element)) {
      return "ellipse";
    }

    // Check for rounded rectangle (border-radius > 0)
    if (this.hasRoundedCorners(element)) {
      return "roundRect";
    }

    // Check for triangle (CSS border trick)
    if (this.isTriangle(element)) {
      return "triangle";
    }

    // Default to rectangle
    return "rect";
  }

  private isCircle(element: ParsedElement): boolean {
    const { borderRadius } = element.styles;
    const { width, height } = element.position;

    if (!borderRadius) return false;

    // Check if border-radius is 50% or if it's a large radius with similar width/height
    const is50Percent = borderRadius.includes("50%");
    const similarDimensions = Math.abs(width - height) < 0.1; // Within 0.1 inches

    return is50Percent && similarDimensions;
  }

  private hasRoundedCorners(element: ParsedElement): boolean {
    const { borderRadius } = element.styles;
    if (!borderRadius || borderRadius === "0px") return false;

    // Parse border-radius value
    const radiusValue = parseFloat(borderRadius);
    return radiusValue > 0;
  }

  private isTriangle(element: ParsedElement): boolean {
    // Detect CSS triangle trick: width/height = 0 + transparent borders with one colored border
    const { width, height } = element.position;
    const { backgroundColor } = element.styles;
    
    // CSS triangles have zero or near-zero width and height
    const isZeroDimensions = width < 0.05 && height < 0.05; // 0.05 inches ~ 5px tolerance
    
    if (!isZeroDimensions) {
      return false;
    }
    
    // Should not have background color
    if (backgroundColor && backgroundColor !== "transparent" && backgroundColor !== "rgba(0, 0, 0, 0)") {
      return false;
    }
    
    // Check if element has any visible border (the triangle is made from borders)
    const borderInfo = this.getVisibleBorderSide(element);
    
    if (borderInfo) {
      console.log(`[Classifier] Triangle detected for ${element.id}! Direction: ${borderInfo.direction}, Color: ${borderInfo.color}, Width: ${borderInfo.width}px`);
      return true;
    }
    
    return false;
  }

  private getVisibleBorderSide(element: ParsedElement): { direction: string; color: string; width: number } | null {
    // CSS triangles have one solid colored border and transparent borders on other sides
    const { 
      borderTopWidth, borderRightWidth, borderBottomWidth, borderLeftWidth,
      borderTopColor, borderRightColor, borderBottomColor, borderLeftColor,
      borderTopStyle, borderRightStyle, borderBottomStyle, borderLeftStyle
    } = element.styles;

    const borders = [
      { side: 'top', width: borderTopWidth, color: borderTopColor, style: borderTopStyle, direction: 'down' },
      { side: 'right', width: borderRightWidth, color: borderRightColor, style: borderRightStyle, direction: 'left' },
      { side: 'bottom', width: borderBottomWidth, color: borderBottomColor, style: borderBottomStyle, direction: 'up' },
      { side: 'left', width: borderLeftWidth, color: borderLeftColor, style: borderLeftStyle, direction: 'right' },
    ];

    // Find the border that is solid and has a non-transparent color
    for (const border of borders) {
      if (!border.width || !border.color || !border.style) continue;
      
      const widthPx = parseFloat(border.width);
      const isSolid = border.style === 'solid';
      const isNotTransparent = border.color !== 'transparent' && 
                               border.color !== 'rgba(0, 0, 0, 0)' &&
                               !border.color.includes('transparent');
      
      if (widthPx > 0 && isSolid && isNotTransparent) {
        console.log(`[Classifier] Found visible border on ${border.side}: ${widthPx}px, ${border.color}`);
        return {
          direction: border.direction,
          color: border.color,
          width: widthPx,
        };
      }
    }

    return null;
  }

  private getTriangleBorderInfo(element: ParsedElement): { direction: string; color: string } {
    // This method is now deprecated in favor of getVisibleBorderSide
    const borderInfo = this.getVisibleBorderSide(element);
    return borderInfo || { direction: 'up', color: '#000000' };
  }

  private getClassificationReason(element: ParsedElement, shapeType: PPTXShapeType): string {
    if (shapeType === "text") return "text tag or content-only";
    if (shapeType === "line") return "hr tag";
    if (shapeType === "ellipse") return "border-radius: 50% + equal dimensions";
    if (shapeType === "roundRect") return `border-radius: ${element.styles.borderRadius}`;
    if (shapeType === "triangle") return "border trick detected";
    return "default rectangle";
  }
}
