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
      // Set viewport to match PowerPoint slide dimensions (10 x 7.5 inches at 96 DPI)
      await page.setViewportSize({
        width: 960,  // 10 inches * 96 DPI
        height: 720, // 7.5 inches * 96 DPI
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
                width: 960px; 
                height: 720px;
                overflow: hidden;
              }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `;

      await page.setContent(fullHtml, { waitUntil: "networkidle" });

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
              backgroundColor: style.backgroundColor,
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

      return layoutData;

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

  async close(): Promise<void> {
    if (this.browser) {
      console.log("[PlaywrightLayoutCollector] Closing browser...");
      await this.browser.close();
      this.browser = null;
    }
  }
}
