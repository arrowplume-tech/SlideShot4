import puppeteer, { Browser, Page } from "puppeteer";
import type { ParsedElement, ComputedStyles, ElementPosition } from "@shared/conversion-types";

export interface BrowserElementData {
  id: string;
  tagName: string;
  textContent: string;
  position: ElementPosition;
  styles: ComputedStyles;
  children: BrowserElementData[];
}

export class BrowserLayoutCollector {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    try {
      console.log("[BrowserLayoutCollector] Launching headless browser...");
      
      // Use system Chromium on NixOS/Replit (find chromium in PATH or /nix/store)
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH 
        || '/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium';
      
      console.log("[BrowserLayoutCollector] Using Chromium at:", executablePath);
      
      this.browser = await puppeteer.launch({
        executablePath,
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ],
      });
      console.log("[BrowserLayoutCollector] Browser launched successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.error("[BrowserLayoutCollector] Failed to launch browser:", errorMessage);
      console.error("[BrowserLayoutCollector] Error stack:", errorStack);
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
      await page.setViewport({
        width: 960,  // 10 inches * 96 DPI
        height: 720, // 7.5 inches * 96 DPI
        deviceScaleFactor: 1,
      });

      console.log("[BrowserLayoutCollector] Setting HTML content...");
      
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

      await page.setContent(fullHtml, { waitUntil: "networkidle0" });

      console.log("[BrowserLayoutCollector] Extracting layout data from DOM...");

      // First, test if page.evaluate works at all
      try {
        const simpleTest = await page.evaluate('1 + 1');
        console.log("[BrowserLayoutCollector] Simple test result:", simpleTest);
      } catch (err) {
        console.error("[BrowserLayoutCollector] Simple test failed:", err);
      }

      // Execute script in browser context to collect all element data  
      // Using string-based function to avoid TSX compilation issues
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

      console.log(`[BrowserLayoutCollector] Collected layout data for ${this.countElements(layoutData)} elements`);

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
      console.log("[BrowserLayoutCollector] Closing browser...");
      await this.browser.close();
      this.browser = null;
    }
  }
}
