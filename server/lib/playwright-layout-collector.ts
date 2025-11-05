import { firefox, Browser, Page } from "playwright";
import type { ParsedElement, ComputedStyles, ElementPosition } from "@shared/conversion-types";

export interface BrowserElementData {
  id: string;
  tagName: string;
  textContent: string;
  position: ElementPosition;
  styles: ComputedStyles;
  children: BrowserElementData[];
}

export class PlaywrightLayoutCollector {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    try {
      console.log("[PlaywrightLayoutCollector] Launching Firefox headless browser...");
      
      this.browser = await firefox.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--disable-gpu'
        ],
      });
      console.log("[PlaywrightLayoutCollector] Browser launched successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error("[PlaywrightLayoutCollector] Failed to launch browser:", errorMessage);
      console.error("[PlaywrightLayoutCollector] Error stack:", errorStack);
      throw new Error(`Не удалось запустить браузер для анализа HTML. Ошибка: ${errorMessage}`);
    }
  }

  async collectLayout(html: string): Promise<BrowserElementData[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    
    try {
      // Set viewport to match PowerPoint slide dimensions (13.333 x 7.5 inches at 96 DPI - wide screen 16:9)
      await page.setViewportSize({
        width: 1280,  // 13.333 inches * 96 DPI
        height: 720,  // 7.5 inches * 96 DPI
      });

      console.log("[PlaywrightLayoutCollector] Setting HTML content...");
      
      // Wrap HTML in a full document if it's not already
      const fullHtml = html.includes("<!DOCTYPE") ? html : `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { 
                margin: 0; 
                padding: 0; 
                width: 1280px; 
                height: 720px;
                overflow: hidden;
              }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `;

      // Use 'load' instead of 'networkidle' to avoid timeout on external resources (Google Fonts, etc)
      await page.setContent(fullHtml, { 
        waitUntil: "load",
        timeout: 60000  // 60 seconds timeout for complex HTML
      });

      console.log("[PlaywrightLayoutCollector] Extracting layout data from DOM...");

      // Execute script in browser context to collect all element data  
      // Using string-based function to ensure browser compatibility
      const pageFunction = `
      (function() {
        var elementIdCounter = 0;

        function getDirectTextContent(element) {
          var text = "";
          var nodes = Array.from(element.childNodes);
          for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.nodeType === 3) {
              var content = node.textContent;
              if (content) {
                text += content.trim();
              }
            }
          }
          return text;
        }

        function shouldSkipElement(element) {
          var tagName = element.tagName.toLowerCase();
          var skipTags = ["script", "style", "meta", "link", "title", "head"];
          if (skipTags.includes(tagName)) return true;

          var style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden") return true;

          return false;
        }

        function collectElementData(element) {
          if (shouldSkipElement(element)) return null;

          var rect = element.getBoundingClientRect();
          var style = window.getComputedStyle(element);

          var pxToInches = function(px) { return px / 96; };

          // Try to get background from inline style first (for gradients), then computed style
          var finalBackground = '';
          
          // First check inline style (most reliable for gradients)
          var inlineBackground = element.style.background || element.style.backgroundImage || element.style.backgroundColor;
          if (inlineBackground && inlineBackground !== 'none' && inlineBackground !== 'transparent' && inlineBackground !== 'rgba(0, 0, 0, 0)') {
            finalBackground = inlineBackground;
          } else {
            // Fallback to computed style
            var bgImage = style.backgroundImage || style.getPropertyValue('background-image');
            var bgColor = style.backgroundColor;
            
            if (bgImage && bgImage !== 'none' && bgImage.includes('gradient')) {
              finalBackground = bgImage;
            } else if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
              finalBackground = bgColor;
            } else {
              // Try to get background shorthand from computed style
              var backgroundShorthand = style.getPropertyValue('background');
              if (backgroundShorthand && backgroundShorthand !== 'none' && backgroundShorthand.includes('gradient')) {
                finalBackground = backgroundShorthand;
              }
            }
          }
          
          // Log gradient detection for debugging
          if (finalBackground && finalBackground.includes('gradient')) {
            console.log(`[Playwright] Gradient detected for ${element.tagName}: ${finalBackground.substring(0, 60)}...`);
          }

          var data = {
            id: "el-" + (elementIdCounter++),
            tagName: element.tagName.toLowerCase(),
            textContent: getDirectTextContent(element),
            position: {
              x: pxToInches(rect.left),
              y: pxToInches(rect.top),
              width: pxToInches(rect.width),
              height: pxToInches(rect.height),
            },
            styles: {
              backgroundColor: finalBackground || style.backgroundColor,
              color: style.color,
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              textAlign: style.textAlign,
              width: style.width,
              height: style.height,
              borderRadius: style.borderRadius,
              borderWidth: style.borderWidth,
              borderStyle: style.borderStyle,
              borderColor: style.borderColor,
              borderTopWidth: style.borderTopWidth,
              borderRightWidth: style.borderRightWidth,
              borderBottomWidth: style.borderBottomWidth,
              borderLeftWidth: style.borderLeftWidth,
              borderTopColor: style.borderTopColor,
              borderRightColor: style.borderRightColor,
              borderBottomColor: style.borderBottomColor,
              borderLeftColor: style.borderLeftColor,
              borderTopStyle: style.borderTopStyle,
              borderRightStyle: style.borderRightStyle,
              borderBottomStyle: style.borderBottomStyle,
              borderLeftStyle: style.borderLeftStyle,
              padding: style.padding,
              margin: style.margin,
              display: style.display,
              position: style.position,
              opacity: style.opacity,
            },
            children: [],
          };

          var children = Array.from(element.children);
          for (var j = 0; j < children.length; j++) {
            var child = children[j];
            var childData = collectElementData(child);
            if (childData) {
              data.children.push(childData);
            }
          }

          return data;
        }

        try {
          var body = document.body;
          if (!body) {
            throw new Error("document.body is null");
          }
          var bodyData = collectElementData(body);
          return bodyData ? bodyData.children : [];
        } catch (error) {
          console.error("Error in page.evaluate:", error);
          throw error;
        }
      })();
      `;
      
      const layoutData = await page.evaluate(pageFunction) as BrowserElementData[];

      console.log(`[PlaywrightLayoutCollector] Collected layout data for ${this.countElements(layoutData)} elements`);
      
      // Normalize coordinates - find min x,y and shift all elements to start from (0,0)
      const normalized = this.normalizeCoordinates(layoutData);
      console.log(`[PlaywrightLayoutCollector] Coordinates normalized to start from (0, 0)`);
      
      // Log detailed information about each top-level element
      this.logDetailedElementInfo(normalized, 0);

      return normalized;

    } finally {
      await page.close();
    }
  }

  private countElements(elements: BrowserElementData[]): number {
    let count = elements.length;
    for (const element of elements) {
      if (element.children) {
        count += this.countElements(element.children);
      }
    }
    return count;
  }

  private logDetailedElementInfo(elements: BrowserElementData[], depth: number): void {
    const indent = "  ".repeat(depth);
    
    for (const el of elements) {
      const pos = el.position;
      const styles = el.styles;
      
      // Format position
      const posStr = `x:${pos.x.toFixed(2)}" y:${pos.y.toFixed(2)}" w:${pos.width.toFixed(2)}" h:${pos.height.toFixed(2)}"`;
      
      // Extract key styles
      const bgColor = styles.backgroundColor || 'transparent';
      const borderRadius = styles.borderRadius || '0px';
      const fontSize = styles.fontSize || 'inherit';
      const textPreview = el.textContent.substring(0, 30) + (el.textContent.length > 30 ? '...' : '');
      
      console.log(`${indent}[Playwright] ${el.id} <${el.tagName}> {`);
      console.log(`${indent}  text: "${textPreview || '(no text)'}"`);
      console.log(`${indent}  position: ${posStr}`);
      console.log(`${indent}  background: ${bgColor}`);
      console.log(`${indent}  borderRadius: ${borderRadius}`);
      console.log(`${indent}  fontSize: ${fontSize}`);
      
      // Warning for huge elements
      if (pos.width > 15 || pos.height > 10) {
        console.warn(`${indent}  ⚠️ HUGE ELEMENT! Exceeds slide bounds (10" x 7.5")`);
      }
      
      // Warning for large border-radius
      const radiusValue = parseFloat(borderRadius);
      if (radiusValue > 100) {
        console.warn(`${indent}  ⚠️ LARGE BORDER-RADIUS: ${borderRadius} - may create unwanted roundRect`);
      }
      
      console.log(`${indent}}`);
      
      // Recursively log children
      if (el.children && el.children.length > 0) {
        this.logDetailedElementInfo(el.children, depth + 1);
      }
    }
  }

  private normalizeCoordinates(elements: BrowserElementData[]): BrowserElementData[] {
    // Find minimum x and y across all elements (including nested)
    let minX = Infinity;
    let minY = Infinity;

    const findMinCoordinates = (els: BrowserElementData[]) => {
      for (const el of els) {
        minX = Math.min(minX, el.position.x);
        minY = Math.min(minY, el.position.y);
        if (el.children && el.children.length > 0) {
          findMinCoordinates(el.children);
        }
      }
    };

    findMinCoordinates(elements);

    // If minX or minY are negative or > 0, shift all elements
    if (minX !== 0 || minY !== 0) {
      console.log(`[PlaywrightLayoutCollector] Shifting coordinates by (-${minX.toFixed(2)}", -${minY.toFixed(2)}")`);
      
      const shiftCoordinates = (els: BrowserElementData[]): BrowserElementData[] => {
        return els.map(el => ({
          ...el,
          position: {
            ...el.position,
            x: el.position.x - minX,
            y: el.position.y - minY,
          },
          children: shiftCoordinates(el.children),
        }));
      };

      return shiftCoordinates(elements);
    }

    return elements;
  }

  async close(): Promise<void> {
    if (this.browser) {
      console.log("[PlaywrightLayoutCollector] Closing browser...");
      await this.browser.close();
      this.browser = null;
    }
  }
}
