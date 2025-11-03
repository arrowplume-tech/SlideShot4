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
    // Detect CSS triangle trick: transparent borders with one colored border
    const { borderWidth, borderStyle, borderColor, backgroundColor } = element.styles;
    
    // This is a simplified check - full implementation would be more complex
    if (!borderWidth || !borderStyle || borderColor === "transparent") return false;
    if (backgroundColor && backgroundColor !== "transparent") return false;
    
    // If border width is significant compared to content
    const borderPx = parseFloat(borderWidth);
    return borderPx > 10 && element.textContent.trim().length === 0;
  }
}
