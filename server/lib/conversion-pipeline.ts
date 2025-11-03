import { HTMLParser } from "./html-parser";
import { ElementClassifier } from "./element-classifier";
import { StyleConverter } from "./style-converter";
import { PPTXGenerator } from "./pptx-generator";
import type { ConversionOptions, ConversionLog, PPTXElement } from "@shared/conversion-types";

export class ConversionPipeline {
  private logs: ConversionLog[] = [];

  async convert(html: string, options: ConversionOptions): Promise<{ buffer: Buffer; logs: ConversionLog[] }> {
    this.logs = [];
    this.addLog("info", "Starting HTML parsing...");

    try {
      // Step 1: Parse HTML
      const parser = new HTMLParser(html);
      const parsedElements = parser.parse();
      this.addLog("success", `Parsed ${parsedElements.length} root elements`);

      // Step 2: Classify elements
      const classifier = new ElementClassifier();
      const classifiedElements = classifier.classify(parsedElements);
      const elementCount = this.countElements(classifiedElements);
      this.addLog("success", `Classified ${elementCount} PowerPoint elements`);

      // Step 3: Convert styles
      const styleConverter = new StyleConverter();
      this.convertAllStyles(parsedElements, classifiedElements, styleConverter);
      this.addLog("success", "Converted CSS styles to PowerPoint format");

      // Step 4: Generate PPTX
      const generator = new PPTXGenerator(options);
      generator.generate(classifiedElements);
      this.addLog("info", "Generating PowerPoint file...");

      const buffer = await generator.toBuffer();
      this.addLog("success", "PowerPoint generation complete!");

      return {
        buffer,
        logs: this.logs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
}
