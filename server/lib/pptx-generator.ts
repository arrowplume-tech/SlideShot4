import pptxgen from "pptxgenjs";
import type { PPTXElement, ConversionOptions } from "@shared/conversion-types";

export class PPTXGenerator {
  private pptx: any;
  private options: ConversionOptions;

  constructor(options: ConversionOptions) {
    this.pptx = new pptxgen();
    this.options = options;
    
    // Set slide dimensions
    this.pptx.layout = "LAYOUT_WIDE";
    this.pptx.defineLayout({
      name: "CUSTOM",
      width: options.slideWidth || 10,
      height: options.slideHeight || 7.5,
    });
    this.pptx.layout = "CUSTOM";
  }

  generate(elements: PPTXElement[]): any {
    const slide = this.pptx.addSlide();
    
    console.log(`[PPTXGenerator] Adding ${elements.length} elements to slide`);
    
    // Add elements to slide
    this.addElementsToSlide(slide, elements);
    
    return this.pptx;
  }

  private addElementsToSlide(slide: any, elements: PPTXElement[]): void {
    for (const element of elements) {
      this.addElement(slide, element);
      
      // Recursively add children
      if (element.children && element.children.length > 0) {
        this.addElementsToSlide(slide, element.children);
      }
    }
  }

  private addElement(slide: any, element: PPTXElement): void {
    const { type, position, styles, text } = element;

    console.log(`[PPTXGenerator] Adding element type: ${type}, position:`, position);

    // Prepare common properties
    const commonProps: any = {
      x: position.x,
      y: position.y,
      w: position.width,
      h: position.height,
    };

    // Add fill color
    if (styles.fill) {
      commonProps.fill = { color: styles.fill };
      if (styles.fillOpacity !== undefined) {
        commonProps.fill.transparency = Math.round((1 - styles.fillOpacity) * 100);
      }
    }

    // Add border
    if (styles.line) {
      commonProps.line = {
        color: styles.line.color,
        pt: styles.line.width,
        dashType: styles.line.dashType,
      };
    }

    switch (type) {
      case "text":
        this.addTextBox(slide, element, commonProps);
        break;
      
      case "rect":
        this.addRectangle(slide, commonProps);
        break;
      
      case "roundRect":
        this.addRoundedRectangle(slide, commonProps);
        break;
      
      case "ellipse":
        this.addEllipse(slide, commonProps);
        break;
      
      case "triangle":
        this.addTriangle(slide, commonProps);
        break;
      
      case "line":
        this.addLine(slide, commonProps);
        break;
    }
  }

  private addTextBox(slide: any, element: PPTXElement, props: any): void {
    const { text, styles } = element;
    
    if (!text) return;

    const textProps: any = {
      ...props,
      text: text,
      fontSize: styles.fontSize || 14,
      color: styles.color || "000000",
      align: styles.align || "left",
      valign: styles.valign || "top",
    };

    if (styles.fontFace) {
      textProps.fontFace = styles.fontFace;
    }

    if (styles.bold) {
      textProps.bold = true;
    }

    if (styles.italic) {
      textProps.italic = true;
    }

    if (styles.underline) {
      textProps.underline = true;
    }

    slide.addText(text, textProps);
  }

  private addRectangle(slide: any, props: any): void {
    slide.addShape(this.pptx.ShapeType.rect, props);
  }

  private addRoundedRectangle(slide: any, props: any): void {
    slide.addShape(this.pptx.ShapeType.roundRect, props);
  }

  private addEllipse(slide: any, props: any): void {
    slide.addShape(this.pptx.ShapeType.ellipse, props);
  }

  private addTriangle(slide: any, props: any): void {
    slide.addShape(this.pptx.ShapeType.triangle, props);
  }

  private addLine(slide: any, props: any): void {
    const lineProps: any = {
      x: props.x,
      y: props.y,
      w: props.w,
      h: 0,
    };

    if (props.line) {
      lineProps.line = props.line;
    }

    slide.addShape(this.pptx.ShapeType.line, lineProps);
  }

  async toBuffer(): Promise<Buffer> {
    const uint8Array = await this.pptx.write({ outputType: "arraybuffer" });
    return Buffer.from(uint8Array as ArrayBuffer);
  }
}
