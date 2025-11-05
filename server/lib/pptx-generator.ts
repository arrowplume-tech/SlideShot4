import PptxGenJS from "pptxgenjs";
import type { PPTXElement, ConversionOptions } from "@shared/conversion-types";

export class PPTXGenerator {
  private pptx: any;
  private options: ConversionOptions;

  constructor(options: ConversionOptions) {
    // Handle both ESM and CommonJS exports
    const PptxConstructor = (PptxGenJS as any).default || PptxGenJS;
    this.pptx = new PptxConstructor();
    this.options = options;
    
    // Set slide dimensions (wide screen 16:9 - 33.87 cm x 19.05 cm = 13.333" x 7.5")
    this.pptx.layout = "LAYOUT_WIDE";
    this.pptx.defineLayout({
      name: "CUSTOM",
      width: options.slideWidth || 13.333,
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

    // Add single-sided borders as separate lines
    if (styles.singleSidedBorders && styles.singleSidedBorders.length > 0) {
      console.log(`[PPTXGenerator] Adding ${styles.singleSidedBorders.length} single-sided border(s)`);
      for (const border of styles.singleSidedBorders) {
        this.addSingleSidedBorder(slide, position, border);
      }
    }

    // Log what we're adding with detailed style information
    const textInfo = text ? `with text: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"` : "no text";
    const fillInfo = styles.fill ? `fill=${styles.fill}` : 'no fill';
    const lineInfo = styles.line ? `line=${styles.line.color}` : 'no line';
    
    console.log(`[PPTXGenerator] Adding ${type} at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}) ${position.width.toFixed(2)}x${position.height.toFixed(2)} ${textInfo}`);
    console.log(`  → Styles: ${fillInfo}, ${lineInfo}`);
    
    // Warning for elements outside slide bounds
    const slideWidth = this.options.slideWidth || 13.333;
    const slideHeight = this.options.slideHeight || 7.5;
    
    if (position.x < 0 || position.y < 0 || 
        position.x + position.width > slideWidth || 
        position.y + position.height > slideHeight) {
      console.warn(`  → ⚠️ Element outside slide bounds! Slide is ${slideWidth}" x ${slideHeight}"`);
    }
    
    // Warning for huge elements
    if (position.width > slideWidth * 1.5 || position.height > slideHeight * 1.5) {
      console.warn(`  → ⚠️ HUGE element! Might be a decorative wrapper.`);
    }

    // Check if shape has text content - this is a problem!
    if (text && text.trim().length > 0 && type !== "text") {
      console.warn(`⚠️  [PPTXGenerator] Shape type "${type}" has text "${text}" - TEXT WILL BE LOST!`);
      console.warn(`    Solution: Add text as separate textbox on top of shape`);
    }

    switch (type) {
      case "text":
        this.addTextBox(slide, element, commonProps);
        break;
      
      case "table":
        this.addTable(slide, element, commonProps);
        break;
      
      case "rect":
        this.addRectangle(slide, commonProps);
        // If rect has text, add it as a textbox on top
        if (text && text.trim().length > 0) {
          this.addTextOverShape(slide, element, commonProps);
        }
        break;
      
      case "roundRect":
        this.addRoundedRectangle(slide, commonProps);
        // If roundRect has text, add it as a textbox on top
        if (text && text.trim().length > 0) {
          this.addTextOverShape(slide, element, commonProps);
        }
        break;
      
      case "ellipse":
        this.addEllipse(slide, commonProps);
        // If ellipse has text, add it as a textbox on top
        if (text && text.trim().length > 0) {
          this.addTextOverShape(slide, element, commonProps);
        }
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

  private addTextOverShape(slide: any, element: PPTXElement, props: any): void {
    const { text, styles } = element;
    
    if (!text) return;

    console.log(`[PPTXGenerator] Adding text overlay: "${text}"`);

    const textProps: any = {
      x: props.x,
      y: props.y,
      w: props.w,
      h: props.h,
      text: text,
      fontSize: styles.fontSize || 14,
      color: styles.color || "FFFFFF",
      align: styles.align || "center",
      valign: styles.valign || "middle",
      bold: styles.bold || false,
      // Don't set fill - let shape background show through
    };

    if (styles.fontFace) {
      textProps.fontFace = styles.fontFace;
    }

    slide.addText(text, textProps);
  }

  private addTable(slide: any, element: PPTXElement, props: any): void {
    if (!element.tableData) {
      console.warn(`[PPTXGenerator] Table element ${element.id} has no tableData!`);
      return;
    }

    const { tableData } = element;
    const { rows, numCols } = tableData;

    // Convert TableData to PptxGenJS format
    // PptxGenJS expects: rows[row][col] where each cell is { text: string, options: {...} }
    const pptxRows: any[][] = [];

    for (const row of rows) {
      const pptxRow: any[] = [];
      for (const cell of row.cells) {
        const cellOptions: any = {};

        // Text content
        const cellText = cell.text || "";

        // Cell fill color
        if (cell.styles.fill) {
          cellOptions.fill = { color: cell.styles.fill };
        }

        // Text color
        if (cell.styles.color) {
          cellOptions.color = cell.styles.color;
        } else {
          cellOptions.color = "000000"; // Default black
        }

        // Font properties
        if (cell.styles.fontSize) {
          cellOptions.fontSize = cell.styles.fontSize;
        }
        if (cell.styles.fontFace) {
          cellOptions.fontFace = cell.styles.fontFace;
        }
        if (cell.styles.bold) {
          cellOptions.bold = true;
        }
        if (cell.styles.italic) {
          cellOptions.italic = true;
        }

        // Alignment
        if (cell.styles.align) {
          cellOptions.align = cell.styles.align;
        } else {
          cellOptions.align = "left";
        }

        // Vertical alignment
        cellOptions.valign = "middle";

        // Border
        if (cell.styles.line) {
          cellOptions.border = {
            type: "solid",
            color: cell.styles.line.color || "000000",
            pt: cell.styles.line.width || 1,
          };
        } else {
          // Default border
          cellOptions.border = {
            type: "solid",
            color: "EEF2F6",
            pt: 1,
          };
        }

        // Header row styling (darker background, bold text)
        if (cell.isHeader) {
          if (!cellOptions.fill) {
            cellOptions.fill = { color: "6C757D" }; // Default header background
          }
          if (!cellOptions.color) {
            cellOptions.color = "FFFFFF"; // White text for dark headers
          }
          cellOptions.bold = true;
        }

        // Create cell object for PptxGenJS
        pptxRow.push({
          text: cellText,
          options: cellOptions,
        });
      }

      // Ensure row has correct number of columns
      while (pptxRow.length < numCols) {
        pptxRow.push({
          text: "",
          options: {
            border: { type: "solid", color: "EEF2F6", pt: 1 },
          },
        });
      }

      pptxRows.push(pptxRow);
    }

    // Table options
    const tableOptions: any = {
      x: props.x,
      y: props.y,
      w: props.w,
      h: props.h,
      colW: props.w / numCols, // Equal column widths
      border: { type: "solid", color: "EEF2F6", pt: 1 },
    };

    console.log(`[PPTXGenerator] Adding table: ${rows.length} rows x ${numCols} columns at (${props.x.toFixed(2)}, ${props.y.toFixed(2)})`);

    try {
      slide.addTable(pptxRows, tableOptions);
      console.log(`[PPTXGenerator] Table added successfully`);
    } catch (error) {
      console.error(`[PPTXGenerator] Error adding table:`, error);
      // Fallback: add as text boxes
      this.addTableAsTextboxes(slide, pptxRows, tableOptions);
    }
  }

  private addTableAsTextboxes(slide: any, rows: any[][], options: any): void {
    // Fallback method if addTable fails
    console.warn(`[PPTXGenerator] Falling back to text boxes for table`);
    const numCols = rows[0]?.length || 0;
    const colWidth = options.w / numCols;
    const rowHeight = options.h / rows.length;

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cell = row[colIndex];
        const cellOptions = cell.options || {};

        slide.addText(cell.text || "", {
          x: options.x + colIndex * colWidth,
          y: options.y + rowIndex * rowHeight,
          w: colWidth,
          h: rowHeight,
          fontSize: cellOptions.fontSize || 10,
          color: cellOptions.color || "000000",
          align: cellOptions.align || "left",
          valign: "middle",
          bold: cellOptions.bold || false,
          fill: cellOptions.fill || { color: "FFFFFF" },
        });
      }
    }
  }

  private addSingleSidedBorder(slide: any, position: any, border: any): void {
    const { side, color, width, dashType } = border;
    
    let x1: number, y1: number, x2: number, y2: number;
    
    // Calculate line coordinates based on border side
    switch (side) {
      case "top":
        x1 = position.x;
        y1 = position.y;
        x2 = position.x + position.width;
        y2 = position.y;
        break;
      case "right":
        x1 = position.x + position.width;
        y1 = position.y;
        x2 = position.x + position.width;
        y2 = position.y + position.height;
        break;
      case "bottom":
        x1 = position.x;
        y1 = position.y + position.height;
        x2 = position.x + position.width;
        y2 = position.y + position.height;
        break;
      case "left":
        x1 = position.x;
        y1 = position.y;
        x2 = position.x;
        y2 = position.y + position.height;
        break;
      default:
        console.warn(`[PPTXGenerator] Unknown border side: ${side}`);
        return;
    }
    
    console.log(`  → Adding ${side} border line from (${x1.toFixed(2)}, ${y1.toFixed(2)}) to (${x2.toFixed(2)}, ${y2.toFixed(2)}) color=#${color} width=${width}pt`);
    
    // Add line shape
    const lineProps: any = {
      x: x1,
      y: y1,
      w: x2 - x1,
      h: y2 - y1,
      line: {
        color: color,
        pt: width,
        dashType: dashType,
      },
    };
    
    slide.addShape(this.pptx.ShapeType.line, lineProps);
  }

  async toBuffer(): Promise<Buffer> {
    const uint8Array = await this.pptx.write({ outputType: "arraybuffer" });
    return Buffer.from(uint8Array as ArrayBuffer);
  }
}
