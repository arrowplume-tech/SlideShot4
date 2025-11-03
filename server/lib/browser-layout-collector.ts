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
    console.log("[BrowserLayoutCollector] Launching headless browser...");
    this.browser = await puppeteer.launch({
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

      // Execute script in browser context to collect all element data
      const layoutData = await page.evaluate(() => {
        let elementIdCounter = 0;

        function getDirectTextContent(element: Element): string {
          let text = "";
          const nodes = Array.from(element.childNodes);
          for (const node of nodes) {
            if (node.nodeType === 3) { // Text node
              text += (node.textContent?.trim() || "");
            }
          }
          return text;
        }

        function shouldSkipElement(element: Element): boolean {
          const tagName = element.tagName.toLowerCase();
          const skipTags = ["script", "style", "meta", "link", "title", "head"];
          if (skipTags.includes(tagName)) return true;

          // Skip if display: none or visibility: hidden
          const style = window.getComputedStyle(element);
          if (style.display === "none" || style.visibility === "hidden") return true;

          return false;
        }

        function collectElementData(element: Element): any {
          if (shouldSkipElement(element)) return null;

          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);

          // Convert pixels to inches (96 DPI)
          const pxToInches = (px: number) => px / 96;

          const data: any = {
            id: `el-${elementIdCounter++}`,
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
              // Individual border sides for CSS triangles
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
            children: [] as any[],
          };

          // Recursively collect children
          const children = Array.from(element.children);
          for (const child of children) {
            const childData = collectElementData(child);
            if (childData) {
              data.children.push(childData);
            }
          }

          return data;
        }

        // Start from body element
        const body = document.body;
        const bodyData = collectElementData(body);
        return bodyData ? bodyData.children : [];
      });

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
