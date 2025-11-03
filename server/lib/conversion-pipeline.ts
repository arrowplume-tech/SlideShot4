import { HTMLParser } from "./html-parser";
import { BrowserLayoutCollector } from "./browser-layout-collector";
import { ElementClassifier } from "./element-classifier";
import { StyleConverter } from "./style-converter";
import { PPTXGenerator } from "./pptx-generator";
import type { ConversionOptions, ConversionLog, PPTXElement, ParsedElement } from "@shared/conversion-types";

export class ConversionPipeline {
  private logs: ConversionLog[] = [];
  private browserCollector: BrowserLayoutCollector | null = null;

  async convert(html: string, options: ConversionOptions): Promise<{ buffer: Buffer; logs: ConversionLog[] }> {
    this.logs = [];
    this.addLog("info", "Starting HTML parsing...");

    try {
      let parsedElements: ParsedElement[];

      // Step 1: Parse HTML - use browser-based layout for better accuracy
      if (options.useBrowserLayout !== false) {
        console.log("[ConversionPipeline] Step 1: Attempting browser-based layout collection");
        this.addLog("info", "Trying headless browser for accurate layout calculation...");
        
        try {
          if (!this.browserCollector) {
            this.browserCollector = new BrowserLayoutCollector();
            await this.browserCollector.initialize();
          }

          const browserElements = await this.browserCollector.collectLayout(html);
          parsedElements = browserElements as unknown as ParsedElement[];
          this.addLog("success", `Layout collected from browser: ${parsedElements.length} root elements`);
          console.log("[ConversionPipeline] Browser-based parsing complete:", parsedElements.length);
        } catch (browserError) {
          const errorMsg = browserError instanceof Error ? browserError.message : String(browserError);
          console.warn("[ConversionPipeline] Browser layout failed, falling back to traditional parser:", errorMsg);
          this.addLog("warning", `Браузер недоступен, используется традиционный парсер HTML`);
          
          const parser = new HTMLParser(html);
          parsedElements = parser.parse();
          this.addLog("info", `Парсинг выполнен традиционным методом: ${parsedElements.length} элементов`);
          console.log("[ConversionPipeline] Fallback parsing complete:", parsedElements.length);
        }
      } else {
        console.log("[ConversionPipeline] Step 1: Using traditional HTML parsing, length:", html.length);
        const parser = new HTMLParser(html);
        parsedElements = parser.parse();
        this.addLog("success", `Parsed ${parsedElements.length} root elements`);
        console.log("[ConversionPipeline] Traditional parsing complete:", parsedElements.length);
      }

      // Step 2: Classify elements
      console.log("[ConversionPipeline] Step 2: Classifying elements");
      const classifier = new ElementClassifier();
      const classifiedElements = classifier.classify(parsedElements);
      const elementCount = this.countElements(classifiedElements);
      this.addLog("success", `Classified ${elementCount} PowerPoint elements`);
      console.log("[ConversionPipeline] Classified element count:", elementCount);

      // Step 3: Convert styles
      console.log("[ConversionPipeline] Step 3: Converting styles");
      const styleConverter = new StyleConverter();
      this.convertAllStyles(parsedElements, classifiedElements, styleConverter);
      this.addLog("success", "Converted CSS styles to PowerPoint format");
      console.log("[ConversionPipeline] Styles converted successfully");

      // Step 4: Generate PPTX
      console.log("[ConversionPipeline] Step 4: Generating PPTX");
      this.addLog("info", "Generating PowerPoint file...");
      const generator = new PPTXGenerator(options);
      generator.generate(classifiedElements);
      console.log("[ConversionPipeline] PPTX structure generated");

      console.log("[ConversionPipeline] Converting to buffer...");
      const buffer = await generator.toBuffer();
      this.addLog("success", "PowerPoint generation complete!");
      console.log("[ConversionPipeline] Buffer created, size:", buffer.length);

      return {
        buffer,
        logs: this.logs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      console.error("[ConversionPipeline] ERROR:", errorMessage);
      console.error("[ConversionPipeline] Stack:", errorStack);
      this.addLog("error", `Conversion failed: ${errorMessage}`);
      throw error;
    }
  }

  private convertAllStyles(
    parsedElements: any[],
    pptxElements: PPTXElement[],
    converter: StyleConverter
  ): void {
    for (let i = 0; i < parsedElements.length; i++) {
      converter.convertStyles(parsedElements[i], pptxElements[i]);
      
      if (parsedElements[i].children && pptxElements[i].children) {
        this.convertAllStyles(
          parsedElements[i].children,
          pptxElements[i].children!,
          converter
        );
      }
    }
  }

  private countElements(elements: PPTXElement[]): number {
    let count = elements.length;
    for (const element of elements) {
      if (element.children) {
        count += this.countElements(element.children);
      }
    }
    return count;
  }

  private addLog(level: ConversionLog["level"], message: string): void {
    this.logs.push({
      level,
      message,
      timestamp: new Date(),
    });
  }

  getLogs(): ConversionLog[] {
    return this.logs;
  }

  async cleanup(): Promise<void> {
    if (this.browserCollector) {
      await this.browserCollector.close();
      this.browserCollector = null;
    }
  }
}
