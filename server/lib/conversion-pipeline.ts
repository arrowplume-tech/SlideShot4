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
          
          if (parsedElements.length === 0) {
            console.warn("[ConversionPipeline] WARNING: All elements were filtered out! This may cause empty slide.");
            this.addLog("warning", "⚠️ Все элементы были отфильтрованы. Возможно, слайд будет пустым.");
          }
          
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
      
      if (parsedElements.length === 0) {
        throw new Error("No elements to convert. All elements were filtered out or HTML is empty.");
      }
      
      const classifier = new ElementClassifier();
      let classifiedElements = classifier.classify(parsedElements);
      
      // Filter out skip elements and flatten the tree
      classifiedElements = this.filterSkipElements(classifiedElements);
      const elementCount = this.countElements(classifiedElements);
      
      if (elementCount === 0) {
        // Log detailed info for debugging
        console.warn("[ConversionPipeline] All elements were skipped or invalid.");
        throw new Error("No valid elements to convert. All elements were marked as skip or invalid.");
      }
      
      this.addLog("success", `Classified ${elementCount} PowerPoint elements (after filtering skip elements)`);
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

      // Step 3.6: Apply auto-scaling if content exceeds slide bounds
      console.log("[ConversionPipeline] Step 3.6: Applying auto-scaling");
      const scaleFactor = this.calculateAndApplyScaling(classifiedElements, options);
      if (scaleFactor < 1) {
        this.addLog("info", `📐 Applied scaling factor: ${(scaleFactor * 100).toFixed(1)}% to fit content on slide`);
        console.log(`[ConversionPipeline] Applied scaling: ${(scaleFactor * 100).toFixed(1)}%`);
      }

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
    let count = 0;
    for (const element of elements) {
      // Don't count "skip" elements
      if (element.type !== "skip") {
        count++;
      }
      if (element.children) {
        count += this.countElements(element.children);
      }
    }
    return count;
  }

  private filterSkipElements(elements: PPTXElement[]): PPTXElement[] {
    const filtered: PPTXElement[] = [];
    for (const element of elements) {
      if (element.type === "skip") {
        // Skip this element, but process its children
        if (element.children && element.children.length > 0) {
          const filteredChildren = this.filterSkipElements(element.children);
          filtered.push(...filteredChildren);
        }
      } else {
        // Keep this element, but filter its children
        const filteredElement = { ...element };
        if (element.children && element.children.length > 0) {
          filteredElement.children = this.filterSkipElements(element.children);
        }
        filtered.push(filteredElement);
      }
    }
    return filtered;
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
    
    // Проверяем элементы вне слайда (using wide screen dimensions)
    const slideWidth = 13.333;
    const slideHeight = 7.5;
    if (pptx.position.x < 0 || pptx.position.y < 0 || 
        pptx.position.x + pptx.position.width > slideWidth + 0.5 || 
        pptx.position.y + pptx.position.height > slideHeight + 0.5) {
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

  private calculateAndApplyScaling(elements: PPTXElement[], options: ConversionOptions): number {
    const slideWidth = options.slideWidth || 13.333;
    const slideHeight = options.slideHeight || 7.5;
    
    // Calculate bounding box of all content
    const bounds = this.calculateContentBounds(elements);
    
    if (!bounds) {
      console.log("[ConversionPipeline] No content bounds calculated, skipping scaling");
      return 1;
    }

    const { minX, minY, maxX, maxY } = bounds;
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    console.log(`[ConversionPipeline] Content bounds: x=${minX.toFixed(2)} y=${minY.toFixed(2)} width=${contentWidth.toFixed(2)} height=${contentHeight.toFixed(2)}`);
    console.log(`[ConversionPipeline] Slide size: ${slideWidth}" x ${slideHeight}"`);

    // Calculate scale factors
    const scaleX = contentWidth > 0 ? Math.min(1, slideWidth / contentWidth) : 1;
    const scaleY = contentHeight > 0 ? Math.min(1, slideHeight / contentHeight) : 1;
    let scale = Math.min(scaleX, scaleY);

    // Apply minimum threshold (0.5 = 50% minimum)
    const minScale = 0.5;
    scale = Math.max(scale, minScale);

    // Only apply scaling if content exceeds bounds
    if (scale < 1) {
      console.log(`[ConversionPipeline] Content exceeds slide bounds, applying scale: ${(scale * 100).toFixed(1)}%`);
      
      // Apply scaling to all elements
      this.applyScalingToElements(elements, scale, minX, minY);
      
      // Recalculate bounds after scaling
      const newBounds = this.calculateContentBounds(elements);
      if (newBounds) {
        const newWidth = newBounds.maxX - newBounds.minX;
        const newHeight = newBounds.maxY - newBounds.minY;
        console.log(`[ConversionPipeline] After scaling: width=${newWidth.toFixed(2)} height=${newHeight.toFixed(2)}`);
        
        // Check if still exceeds bounds
        if (newWidth > slideWidth || newHeight > slideHeight) {
          this.addLog("warning", `⚠️ Content still exceeds slide bounds after scaling. User may need to adjust in PowerPoint.`);
        }
      }
    } else {
      console.log(`[ConversionPipeline] Content fits within slide bounds, no scaling needed`);
    }

    return scale;
  }

  private calculateContentBounds(elements: PPTXElement[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (elements.length === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const traverse = (el: PPTXElement) => {
      const { x, y, width, height } = el.position;
      
      // Update bounds
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);

      // Recursively process children (but skip table children as they're already in the table structure)
      if (el.children && el.type !== "table") {
        el.children.forEach(traverse);
      }
    };

    elements.forEach(traverse);

    if (minX === Infinity) {
      return null;
    }

    return { minX, minY, maxX, maxY };
  }

  private applyScalingToElements(elements: PPTXElement[], scale: number, originX: number, originY: number): void {
    const scaleElement = (el: PPTXElement) => {
      // Scale position relative to origin
      el.position.x = originX + (el.position.x - originX) * scale;
      el.position.y = originY + (el.position.y - originY) * scale;
      
      // Scale dimensions
      el.position.width = el.position.width * scale;
      el.position.height = el.position.height * scale;

      // Scale font sizes if they exist
      if (el.styles.fontSize) {
        el.styles.fontSize = Math.max(6, Math.round(el.styles.fontSize * scale)); // Minimum 6pt
      }

      // Recursively scale children (but skip table children)
      if (el.children && el.type !== "table") {
        el.children.forEach(scaleElement);
      }
    };

    elements.forEach(scaleElement);
  }

  private validateSlideBounds(elements: ParsedElement[], options: ConversionOptions): void {
    const slideWidth = options.slideWidth || 13.333;
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
    
    const slideWidth = 13.333;
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
    
    // Don't filter elements that are within reasonable bounds (even if slightly larger due to padding/margins)
    // Only filter elements that are clearly decorative wrappers (much larger than slide)
    const tolerance = 0.2; // 20% tolerance for containers with padding/margins
    const exceedsWidth = el.position.width > slideWidth * (1 + tolerance);
    const exceedsHeight = el.position.height > slideHeight * (1 + tolerance);
    
    // Only filter if element is MUCH larger (at least 50% larger than slide)
    // This prevents filtering legitimate content containers
    if (exceedsWidth && el.position.width > slideWidth * 1.5) {
      return { 
        filter: true, 
        reason: `element (${el.position.width.toFixed(2)}" x ${el.position.height.toFixed(2)}") significantly exceeds slide size (${slideWidth}" x ${slideHeight}")`
      };
    }
    
    if (exceedsHeight && el.position.height > slideHeight * 1.5) {
      return { 
        filter: true, 
        reason: `element (${el.position.width.toFixed(2)}" x ${el.position.height.toFixed(2)}") significantly exceeds slide size (${slideWidth}" x ${slideHeight}")`
      };
    }
    
    // Filter out huge elements that exceed slide bounds significantly
    const isHuge = el.position.width > slideWidth * 2 || el.position.height > slideHeight * 2;
    if (isHuge) {
      return { 
        filter: true, 
        reason: `HUGE element (${el.position.width.toFixed(2)}" x ${el.position.height.toFixed(2)}") exceeds 2x slide size`
      };
    }
    
    // Filter out elements with large border-radius that also have gray backgrounds (decorative полуовалы)
    const borderRadius = el.styles.borderRadius || "0px";
    const radiusValue = parseFloat(borderRadius);
    const bgColor = el.styles.backgroundColor || "";
    const isGrayish = bgColor.includes("rgb(245") || bgColor.includes("rgb(240") || 
                      bgColor.includes("rgb(250") || bgColor.includes("#f5f5f5") || 
                      bgColor.includes("#f0f0f0");
    
    if (radiusValue > 100 && isGrayish && (el.position.width > slideWidth * 0.8 || el.position.height > slideHeight * 0.8)) {
      return {
        filter: true,
        reason: `decorative wrapper: large border-radius (${borderRadius}) + gray background + large size`
      };
    }
    
    // Filter out any element with extremely large border-radius
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
