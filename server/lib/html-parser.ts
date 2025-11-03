import { JSDOM } from "jsdom";
import type { ParsedElement, ComputedStyles, ElementPosition } from "@shared/conversion-types";

interface LayoutContext {
  originX: number; // Parent container's X origin
  originY: number; // Parent container's Y origin
  cumulativeY: number; // Current flow Y offset within container
  cumulativeX: number; // Current flow X offset within container
  isPositioned: boolean; // Whether this container establishes a containing block
}

export class HTMLParser {
  private dom: JSDOM;
  private elementIdCounter = 0;
  private layoutStack: LayoutContext[] = [];

  constructor(html: string) {
    // Create a JSDOM instance with a complete HTML document
    const fullHtml = html.includes("<!DOCTYPE") ? html : `
      <!DOCTYPE html>
      <html>
        <head><style>body { margin: 0; padding: 0; }</style></head>
        <body>${html}</body>
      </html>
    `;
    this.dom = new JSDOM(fullHtml);
  }

  parse(): ParsedElement[] {
    const body = this.dom.window.document.body;
    // Initialize root layout context (root is a positioning context)
    this.layoutStack = [{ originX: 0, originY: 0, cumulativeY: 0, cumulativeX: 0, isPositioned: true }];
    return this.parseElement(body).children;
  }

  private parseElement(element: Element): ParsedElement {
    const window = this.dom.window;
    const computedStyle = window.getComputedStyle(element);
    
    const styles = this.extractStyles(computedStyle);
    const position = this.calculatePosition(element, computedStyle);
    
    const parsedElement: ParsedElement = {
      id: `el-${this.elementIdCounter++}`,
      tagName: element.tagName.toLowerCase(),
      textContent: this.getDirectTextContent(element),
      styles,
      position,
      children: [],
    };

    // Parse children with a new layout context
    if (element.children.length > 0) {
      // Save current context and create new one for children
      const parentContext = this.getCurrentContext();
      const paddingTop = this.parseDimension(computedStyle.paddingTop) || 0;
      const paddingLeft = this.parseDimension(computedStyle.paddingLeft) || 0;
      
      // Check if this element establishes a new positioning context
      const positionValue = computedStyle.position || "static";
      const isPositioningContext = positionValue !== "static";
      
      // Children are positioned relative to parent's content box
      this.pushContext({
        originX: position.x * 96 + paddingLeft,
        originY: position.y * 96 + paddingTop,
        cumulativeY: 0,
        cumulativeX: 0,
        isPositioned: isPositioningContext,
      });
      
      const children = Array.from(element.children);
      parsedElement.children = children
        .filter((child) => this.shouldIncludeElement(child))
        .map((child) => this.parseElement(child));
      
      // Restore parent context
      this.popContext();
    }

    return parsedElement;
  }

  private getCurrentContext(): LayoutContext {
    return this.layoutStack[this.layoutStack.length - 1];
  }

  private getNearestPositioningContext(): LayoutContext {
    // Find the nearest ancestor that establishes a positioning context
    for (let i = this.layoutStack.length - 1; i >= 0; i--) {
      if (this.layoutStack[i].isPositioned) {
        return this.layoutStack[i];
      }
    }
    // Fallback to root (should always exist)
    return this.layoutStack[0];
  }

  private pushContext(context: LayoutContext): void {
    this.layoutStack.push(context);
  }

  private popContext(): void {
    if (this.layoutStack.length > 1) {
      this.layoutStack.pop();
    }
  }

  private extractStyles(style: CSSStyleDeclaration): ComputedStyles {
    return {
      backgroundColor: style.backgroundColor || undefined,
      color: style.color || undefined,
      fontSize: style.fontSize || undefined,
      fontFamily: style.fontFamily || undefined,
      fontWeight: style.fontWeight || undefined,
      fontStyle: style.fontStyle || undefined,
      textAlign: style.textAlign || undefined,
      width: style.width || undefined,
      height: style.height || undefined,
      borderRadius: style.borderRadius || undefined,
      borderWidth: style.borderWidth || undefined,
      borderStyle: style.borderStyle || undefined,
      borderColor: style.borderColor || undefined,
      padding: style.padding || undefined,
      margin: style.margin || undefined,
      display: style.display || undefined,
      position: style.position || undefined,
      top: style.top || undefined,
      left: style.left || undefined,
      transform: style.transform || undefined,
      opacity: style.opacity || undefined,
    };
  }

  private calculatePosition(element: Element, style: CSSStyleDeclaration): ElementPosition {
    // Parse dimensions from inline styles and computed styles
    // JSDOM's getBoundingClientRect doesn't work without a layout engine
    const pxToInches = (px: number) => px / 96;
    
    // Get element to check for inline styles
    const el = element as HTMLElement;
    const tagName = element.tagName.toLowerCase();
    const context = this.getCurrentContext();
    
    // Parse width - try inline style first, then computed, then default
    let widthPx = this.parseDimension(el.style.width) || this.parseDimension(style.width);
    if (!widthPx || widthPx === 0) {
      // Check for max-width
      const maxWidth = this.parseDimension(el.style.maxWidth) || this.parseDimension(style.maxWidth);
      widthPx = maxWidth || this.getDefaultWidth(tagName);
    }
    
    // Parse height - try inline style first, then computed, then default
    let heightPx = this.parseDimension(el.style.height) || this.parseDimension(style.height);
    if (!heightPx || heightPx === 0) {
      heightPx = this.getDefaultHeight(tagName);
    }
    
    // Parse margins
    const marginTop = this.parseDimension(style.marginTop) || 0;
    const marginBottom = this.parseDimension(style.marginBottom) || 0;
    const marginLeft = this.parseDimension(style.marginLeft) || 0;
    const marginRight = this.parseDimension(style.marginRight) || 0;
    
    // Determine positioning
    const position = style.position || "static";
    let leftPx = 0;
    let topPx = 0;
    
    if (position === "fixed") {
      // Fixed positioned - always relative to slide root (viewport in CSS)
      // Handle left/right and top/bottom
      const hasLeft = (el.style.left || style.left);
      const hasRight = (el.style.right || style.right);
      const hasTop = (el.style.top || style.top);
      const hasBottom = (el.style.bottom || style.bottom);
      
      if (hasLeft) {
        leftPx = this.parseDimension(el.style.left) || this.parseDimension(style.left) || 0;
      } else if (hasRight) {
        // Right edge positioning: assume 10 inch slide width (960px @ 96dpi)
        const slideWidth = 960;
        const rightPx = this.parseDimension(el.style.right) || this.parseDimension(style.right) || 0;
        leftPx = slideWidth - widthPx - rightPx;
      }
      
      if (hasTop) {
        topPx = this.parseDimension(el.style.top) || this.parseDimension(style.top) || 0;
      } else if (hasBottom) {
        // Bottom edge positioning: assume 7.5 inch slide height (720px @ 96dpi)
        const slideHeight = 720;
        const bottomPx = this.parseDimension(el.style.bottom) || this.parseDimension(style.bottom) || 0;
        topPx = slideHeight - heightPx - bottomPx;
      }
    } else if (position === "absolute") {
      // Absolutely positioned - relative to nearest positioning context
      const positioningContext = this.getNearestPositioningContext();
      
      const hasLeft = (el.style.left || style.left);
      const hasRight = (el.style.right || style.right);
      const hasTop = (el.style.top || style.top);
      const hasBottom = (el.style.bottom || style.bottom);
      
      if (hasLeft) {
        const explicitLeft = this.parseDimension(el.style.left) || this.parseDimension(style.left) || 0;
        leftPx = positioningContext.originX + explicitLeft;
      } else if (hasRight) {
        // Right edge positioning - need container width (approximate for MVP)
        const containerWidth = 960; // Default assumption
        const rightPx = this.parseDimension(el.style.right) || this.parseDimension(style.right) || 0;
        leftPx = positioningContext.originX + containerWidth - widthPx - rightPx;
      } else {
        leftPx = positioningContext.originX;
      }
      
      if (hasTop) {
        const explicitTop = this.parseDimension(el.style.top) || this.parseDimension(style.top) || 0;
        topPx = positioningContext.originY + explicitTop;
      } else if (hasBottom) {
        // Bottom edge positioning - need container height (approximate for MVP)
        const containerHeight = 720; // Default assumption
        const bottomPx = this.parseDimension(el.style.bottom) || this.parseDimension(style.bottom) || 0;
        topPx = positioningContext.originY + containerHeight - heightPx - bottomPx;
      } else {
        topPx = positioningContext.originY;
      }
    } else {
      // Flow layout - position relative to parent with cumulative offset
      const display = style.display || "block";
      
      if (display === "inline" || display === "inline-block") {
        // Inline elements flow horizontally
        leftPx = context.originX + context.cumulativeX + marginLeft;
        topPx = context.originY + context.cumulativeY;
        // Update horizontal flow for next inline sibling
        context.cumulativeX += marginLeft + widthPx + marginRight;
      } else {
        // Block elements flow vertically
        leftPx = context.originX + marginLeft;
        topPx = context.originY + context.cumulativeY + marginTop;
        
        // Update cumulative Y for next sibling
        context.cumulativeY += marginTop + heightPx + marginBottom;
        context.cumulativeX = 0; // Reset horizontal position for next line
      }
      
      // For position: relative or sticky, apply offset adjustments
      if (position === "relative" || position === "sticky") {
        // Handle left/right offsets
        const hasLeft = (el.style.left || style.left);
        const hasRight = (el.style.right || style.right);
        if (hasLeft) {
          const offsetLeft = this.parseDimension(el.style.left) || this.parseDimension(style.left) || 0;
          leftPx += offsetLeft;
        } else if (hasRight) {
          const offsetRight = this.parseDimension(el.style.right) || this.parseDimension(style.right) || 0;
          leftPx -= offsetRight; // Right offset moves element left
        }
        
        // Handle top/bottom offsets
        const hasTop = (el.style.top || style.top);
        const hasBottom = (el.style.bottom || style.bottom);
        if (hasTop) {
          const offsetTop = this.parseDimension(el.style.top) || this.parseDimension(style.top) || 0;
          topPx += offsetTop;
        } else if (hasBottom) {
          const offsetBottom = this.parseDimension(el.style.bottom) || this.parseDimension(style.bottom) || 0;
          topPx -= offsetBottom; // Bottom offset moves element up
        }
      }
    }
    
    return {
      x: pxToInches(leftPx),
      y: pxToInches(topPx),
      width: pxToInches(widthPx),
      height: pxToInches(heightPx),
    };
  }

  private parseDimension(value: string | undefined): number {
    if (!value) return 0;
    
    // Handle px values
    if (value.includes("px")) {
      return parseFloat(value);
    }
    
    // Handle percentage (assume 1000px container for now)
    if (value.includes("%")) {
      const percent = parseFloat(value);
      return (percent / 100) * 1000;
    }
    
    // Try to parse as number
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }

  private getDefaultWidth(tagName: string): number {
    // Default widths in pixels for common elements
    const defaults: Record<string, number> = {
      h1: 600,
      h2: 500,
      h3: 400,
      h4: 350,
      h5: 300,
      h6: 250,
      p: 500,
      span: 200,
      div: 400,
      button: 150,
    };
    return defaults[tagName] || 400;
  }

  private getDefaultHeight(tagName: string): number {
    // Default heights in pixels for common elements
    const defaults: Record<string, number> = {
      h1: 60,
      h2: 50,
      h3: 40,
      h4: 35,
      h5: 30,
      h6: 25,
      p: 30,
      span: 20,
      div: 200,
      button: 40,
      hr: 2,
    };
    return defaults[tagName] || 100;
  }

  private getDirectTextContent(element: Element): string {
    let text = "";
    const nodes = Array.from(element.childNodes);
    for (const node of nodes) {
      if (node.nodeType === 3) { // Text node
        text += node.textContent?.trim() || "";
      }
    }
    return text;
  }

  private shouldIncludeElement(element: Element): boolean {
    // Skip script, style, and other non-visual elements
    const skipTags = ["script", "style", "meta", "link", "title"];
    return !skipTags.includes(element.tagName.toLowerCase());
  }
}
