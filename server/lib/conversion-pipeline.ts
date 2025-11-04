import { HTMLParser } from "./html-parser";
import { PlaywrightLayoutCollector } from "./playwright-layout-collector";
import { ElementClassifier } from "./element-classifier";
import { StyleConverter } from "./style-converter";
import { PPTXGenerator } from "./pptx-generator";
import type { ConversionOptions, ConversionLog, PPTXElement, ParsedElement } from "@shared/conversion-types";

export class ConversionPipeline {
  private logs: ConversionLog[] = [];
  private browserCollector: PlaywrightLayoutCollector | null = null;

  async convert(html: string, options: ConversionOptions): Promise<{ buffer: Buffer; logs: ConversionLog[] }> {
    this.logs = [];
    this.addLog("info", "Starting HTML parsing...");

    try {
      let parsedElements: ParsedElement[];

      // Step 1: Parse HTML - use browser-based layout for better accuracy
      if (options.useBrowserLayout !== false) {
        console.log("[ConversionPipeline] Step 1: Attempting Playwright-based layout collection");
        this.addLog("info", "Использую Playwright для точного расчета позиций...");
        
        try {
          if (!this.browserCollector) {
            this.browserCollector = new PlaywrightLayoutCollector();
            await this.browserCollector.initialize();
          }

          const browserElements = await this.browserCollector.collectLayout(html);
          
          // Filter out decorative wrappers BEFORE processing
          const filteredElements = this.filterDecorativeElements(browserElements as unknown as ParsedElement[]);
          parsedElements = filteredElements;
          
          this.addLog("success", `✅ Playwright: получено ${parsedElements.length} элементов с точными позициями`);
          console.log("[ConversionPipeline] Playwright-based parsing complete:", parsedElements.length);
        } catch (browserError) {
          const errorMsg = browserError instanceof Error ? browserError.message : String(browserError);
          console.warn("[ConversionPipeline] Playwright layout failed, falling back to traditional parser:", errorMsg);
          this.addLog("warning", `⚠️ Playwright недоступен, используется JSDOM парсер (точность ~70%)`);
          
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
      
      // Step 2.5: Validate slide bounds
      console.log("[ConversionPipeline] Step 2.5: Validating slide bounds");
      this.validateSlideBounds(parsedElements, options);

      // Step 3: Convert styles
      console.log("[ConversionPipeline] Step 3: Converting styles");
      const styleConverter = new StyleConverter();
      this.convertAllStyles(parsedElements, classifiedElements, styleConverter);
      this.addLog("success", "Converted CSS styles to PowerPoint format");
      console.log("[ConversionPipeline] Styles converted successfully");
      
      // Step 3.5: Log detailed element transformations
      console.log("[ConversionPipeline] Step 3.5: Logging element transformations");
      this.addLog("info", "📊 Детальный анализ трансформации элементов:");
      this.logAllElementTransformations(parsedElements, classifiedElements);

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

  private logAllElementTransformations(
    parsedElements: ParsedElement[],
    pptxElements: PPTXElement[]
  ): void {
    for (let i = 0; i < parsedElements.length; i++) {
      this.logElementTransformation(parsedElements[i], pptxElements[i]);
      
      if (parsedElements[i].children && pptxElements[i].children) {
        this.logAllElementTransformations(
          parsedElements[i].children,
          pptxElements[i].children!
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

  private addLog(level: ConversionLog["level"], message: string, elementData?: ConversionLog["elementData"]): void {
    this.logs.push({
      level,
      message,
      timestamp: new Date(),
      elementData,
    });
  }

  private logElementTransformation(
    parsed: ParsedElement,
    pptx: PPTXElement
  ): void {
    const textPreview = parsed.textContent.substring(0, 50) + (parsed.textContent.length > 50 ? "..." : "");
    const htmlPos = `x:${parsed.position.x.toFixed(2)}" y:${parsed.position.y.toFixed(2)}" w:${parsed.position.width.toFixed(2)}" h:${parsed.position.height.toFixed(2)}"`;
    const pptxPos = `x:${pptx.position.x.toFixed(2)}" y:${pptx.position.y.toFixed(2)}" w:${pptx.position.width.toFixed(2)}" h:${pptx.position.height.toFixed(2)}"`;
    
    // Проверка корректности позиций
    let status: "ok" | "warning" | "error" = "ok";
    let issue: string | undefined;
    
    // Проверяем что позиция изменилась (если браузер был использован)
    const positionsDiffer = 
      Math.abs(parsed.position.x - pptx.position.x) > 0.01 ||
      Math.abs(parsed.position.y - pptx.position.y) > 0.01;
    
    // Проверяем что текст не потерян
    if (parsed.textContent && pptx.type !== "text" && !pptx.text) {
      status = "warning";
      issue = `Текст "${textPreview}" может быть потерян в ${pptx.type}`;
    }
    
    // Проверяем слишком маленькие размеры
    if (pptx.position.width < 0.1 || pptx.position.height < 0.1) {
      status = "warning";
      issue = "Элемент слишком маленький (< 0.1\")";
    }
    
    // Проверяем элементы вне слайда
    if (pptx.position.x < 0 || pptx.position.y < 0 || 
        pptx.position.x + pptx.position.width > 10.5 || 
        pptx.position.y + pptx.position.height > 8) {
      status = "error";
      issue = "Элемент за пределами слайда";
    }
    
    this.addLog("element", `${parsed.tagName}#${parsed.id} → ${pptx.type}`, {
      id: parsed.id,
      tag: parsed.tagName,
      text: textPreview,
      htmlPosition: htmlPos,
      pptxPosition: pptxPos,
      pptxType: pptx.type,
      status,
      issue,
    });
  }

  getLogs(): ConversionLog[] {
    return this.logs;
  }

  private validateSlideBounds(elements: ParsedElement[], options: ConversionOptions): void {
    const slideWidth = options.slideWidth || 10;
    const slideHeight = options.slideHeight || 7.5;
    let outsideCount = 0;
    
    const checkBounds = (el: ParsedElement) => {
      const { x, y, width, height } = el.position;
      
      // Check if element is completely or partially outside slide
      if (x < 0 || y < 0 || x + width > slideWidth || y + height > slideHeight) {
        outsideCount++;
        
        const issue = [];
        if (x < 0) issue.push(`x=${x.toFixed(2)}" < 0"`);
        if (y < 0) issue.push(`y=${y.toFixed(2)}" < 0"`);
        if (x + width > slideWidth) issue.push(`right edge at ${(x + width).toFixed(2)}" > ${slideWidth}"`);
        if (y + height > slideHeight) issue.push(`bottom edge at ${(y + height).toFixed(2)}" > ${slideHeight}"`);
        
        console.warn(`  ⚠️ ${el.id} <${el.tagName}> outside bounds: ${issue.join(', ')}`);
      }
      
      // Recursively check children
      if (el.children) {
        el.children.forEach(checkBounds);
      }
    };
    
    elements.forEach(checkBounds);
    
    if (outsideCount > 0) {
      this.addLog("warning", `⚠️ ${outsideCount} elements are outside slide bounds (${slideWidth}" x ${slideHeight}")`);
      console.warn(`[ConversionPipeline] ${outsideCount} elements outside slide bounds!`);
    } else {
      console.log(`[ConversionPipeline] All elements within slide bounds ✓`);
    }
  }

  private filterDecorativeElements(elements: ParsedElement[]): ParsedElement[] {
    console.log("[ConversionPipeline] Filtering decorative wrapper elements...");
    
    const slideWidth = 10;
    const slideHeight = 7.5;
    let filteredCount = 0;
    
    const processElement = (el: ParsedElement): ParsedElement[] => {
      // Recursively process children first
      let processedChildren: ParsedElement[] = [];
      if (el.children && el.children.length > 0) {
        processedChildren = el.children.flatMap(child => processElement(child));
      }
      
      // Check if element should be filtered
      const shouldFilter = this.shouldFilterElement(el, slideWidth, slideHeight);
      
      if (shouldFilter.filter) {
        filteredCount++;
        console.warn(`  → Filtered out ${el.id} <${el.tagName}> - ${shouldFilter.reason}`);
        
        // Return children instead of this element (flatten the tree)
        if (processedChildren.length > 0) {
          console.log(`  → Keeping ${processedChildren.length} children of filtered element`);
        }
        return processedChildren;
      }
      
      // Keep this element but with processed children
      return [{
        ...el,
        children: processedChildren
      }];
    };
    
    const filtered = elements.flatMap(el => processElement(el));
    
    console.log(`[ConversionPipeline] Filtered: ${filteredCount} decorative elements removed, ${filtered.length} top-level elements kept`);
    
    return filtered;
  }
  
  private shouldFilterElement(el: ParsedElement, slideWidth: number, slideHeight: number): { filter: boolean; reason?: string } {
    // Skip body and html tags - they are page wrappers, not content
    if (el.tagName === 'body' || el.tagName === 'html') {
      return { filter: true, reason: `<${el.tagName}> is page wrapper, not content` };
    }
    
    // Filter out huge elements that exceed slide bounds significantly
    const isHuge = el.position.width > slideWidth * 2 || el.position.height > slideHeight * 2;
    if (isHuge) {
      return { 
        filter: true, 
        reason: `HUGE element (${el.position.width.toFixed(2)}" x ${el.position.height.toFixed(2)}") exceeds 2x slide size`
      };
    }
    
    // Filter out elements with enormous border-radius (likely decorative полуовалы)
    const borderRadius = el.styles.borderRadius || "0px";
    const radiusValue = parseFloat(borderRadius);
    if (radiusValue > 500) {
      return {
        filter: true,
        reason: `enormous border-radius (${borderRadius}), likely decorative`
      };
    }
    
    return { filter: false };
  }

  async cleanup(): Promise<void> {
    if (this.browserCollector) {
      await this.browserCollector.close();
      this.browserCollector = null;
    }
  }
}
