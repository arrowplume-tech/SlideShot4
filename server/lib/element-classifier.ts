import type { ParsedElement, PPTXElement, PPTXShapeType, TableData, TableRow, TableCell } from "@shared/conversion-types";

export class ElementClassifier {
  classify(elements: ParsedElement[]): PPTXElement[] {
    return elements.map((el) => this.classifyElement(el));
  }

  private classifyElement(element: ParsedElement): PPTXElement {
    const shapeType = this.determineShapeType(element);
    const hasText = element.textContent.trim().length > 0 || element.tagName.match(/^(h[1-6]|p|span|a|button|label)$/);

    const pptxElement: PPTXElement = {
      id: element.id,
      type: shapeType,
      position: element.position,
      styles: {},
      text: hasText ? element.textContent : undefined,
      children: element.children.length > 0 ? this.classify(element.children) : undefined,
    };

    // Если это таблица, собираем структуру таблицы
    if (shapeType === "table") {
      const tableData = this.buildTableData(element);
      if (tableData) {
        pptxElement.tableData = tableData;
        console.log(`[Classifier] Table structure built: ${tableData.rows.length} rows, ${tableData.numCols} columns`);
      }
      // Не обрабатываем children таблицы как отдельные элементы - они уже в структуре таблицы
      pptxElement.children = undefined;
    }

    // Log classification decision with detailed info
    const textWarning = hasText && shapeType !== "text" && shapeType !== "table" ? " ⚠️ TEXT WILL BE LOST!" : "";
    const textPreview = hasText ? element.textContent.substring(0, 40) : "(no text)";
    const reason = this.getClassificationReason(element, shapeType);
    
    console.log(`[Classifier] ${element.id} <${element.tagName}> → ${shapeType}${textWarning} { text: "${textPreview}", reason: '${reason}' }`);
    
    // Additional detailed logging for roundRect (potential полуовалы!)
    if (shapeType === "roundRect") {
      const pos = element.position;
      const borderRadius = element.styles.borderRadius || "0px";
      console.log(`  → roundRect details: position=(${pos.x.toFixed(2)}", ${pos.y.toFixed(2)}", ${pos.width.toFixed(2)}", ${pos.height.toFixed(2)}"), borderRadius=${borderRadius}, bg=${element.styles.backgroundColor}`);
      
      if (pos.width > 15 || pos.height > 10) {
        console.warn(`  → ⚠️ HUGE roundRect! This might be a decorative wrapper that should be filtered out!`);
      }
    }

    return pptxElement;
  }

  private determineShapeType(element: ParsedElement): PPTXShapeType {
    const { styles, tagName } = element;

    // Check for table FIRST (before other checks)
    if (this.isTableElement(element) || this.isTableLikeStructure(element)) {
      return "table";
    }

    // Text elements
    if (tagName.match(/^(h[1-6]|p|span|a|label)$/)) {
      return "text";
    }

    // Horizontal rule -> line
    if (tagName === "hr") {
      return "line";
    }

    // Check for circle (border-radius: 50% with equal width/height)
    if (this.isCircle(element)) {
      return "ellipse";
    }

    // Check for rounded rectangle (border-radius > 0)
    if (this.hasRoundedCorners(element)) {
      return "roundRect";
    }

    // Check for triangle (CSS border trick)
    if (this.isTriangle(element)) {
      return "triangle";
    }

    // Default to rectangle
    return "rect";
  }

  private isTableElement(element: ParsedElement): boolean {
    // Check for native HTML table tags
    return element.tagName === "table";
  }

  private isTableLikeStructure(element: ParsedElement): boolean {
    // Skip if it's already a native table element
    if (element.tagName === "table" || element.tagName === "thead" || element.tagName === "tbody" || 
        element.tagName === "tr" || element.tagName === "th" || element.tagName === "td") {
      return false;
    }

    // Need at least 2 children (rows)
    if (element.children.length < 2) {
      return false;
    }

    // Check if all children have the same structure (same number of direct children)
    const firstRowChildCount = element.children[0].children.length;
    
    // Need at least 2 columns
    if (firstRowChildCount < 2) {
      return false;
    }

    // Check if all rows have the same number of columns
    const allRowsHaveSameColumns = element.children.every(row => row.children.length === firstRowChildCount);
    
    if (!allRowsHaveSameColumns) {
      return false;
    }

    // Additional check: look for common table-like class names
    const tableLikePatterns = [
      /detail-row/i,
      /row/i,
      /table-row/i,
      /tr/i,
    ];

    const hasTableLikeClasses = element.children.some(row => 
      tableLikePatterns.some(pattern => {
        // Check if any child has matching class name pattern in its structure
        return row.children.some(cell => 
          cell.tagName.toLowerCase().includes('label') || 
          cell.tagName.toLowerCase().includes('value') ||
          cell.tagName.toLowerCase().includes('cell')
        );
      })
    );

    // If we have consistent structure AND table-like patterns, it's likely a table
    if (hasTableLikeClasses) {
      console.log(`[Classifier] Table-like structure detected for ${element.id}: ${element.children.length} rows, ${firstRowChildCount} columns`);
      return true;
    }

    // Also check if structure is very regular (all rows have same column count and similar positioning)
    // This catches cases like detail-row without explicit class names
    const isRegularStructure = element.children.every(row => {
      // All cells should be direct children
      return row.children.length === firstRowChildCount;
    });

    // For very regular structures with many rows, likely a table
    if (isRegularStructure && element.children.length >= 2 && firstRowChildCount >= 2) {
      console.log(`[Classifier] Regular table-like structure detected for ${element.id}: ${element.children.length} rows, ${firstRowChildCount} columns`);
      return true;
    }

    return false;
  }

  private isCircle(element: ParsedElement): boolean {
    const { borderRadius } = element.styles;
    const { width, height } = element.position;

    if (!borderRadius) return false;

    // Check if border-radius is 50% or if it's a large radius with similar width/height
    const is50Percent = borderRadius.includes("50%");
    const similarDimensions = Math.abs(width - height) < 0.1; // Within 0.1 inches

    return is50Percent && similarDimensions;
  }

  private hasRoundedCorners(element: ParsedElement): boolean {
    const { borderRadius } = element.styles;
    if (!borderRadius || borderRadius === "0px") return false;

    // Parse border-radius value
    const radiusValue = parseFloat(borderRadius);
    return radiusValue > 0;
  }

  private isTriangle(element: ParsedElement): boolean {
    // Detect CSS triangle trick: width/height = 0 + transparent borders with one colored border
    const { width, height } = element.position;
    const { backgroundColor } = element.styles;
    
    // CSS triangles have zero or near-zero width and height
    const isZeroDimensions = width < 0.05 && height < 0.05; // 0.05 inches ~ 5px tolerance
    
    if (!isZeroDimensions) {
      return false;
    }
    
    // Should not have background color
    if (backgroundColor && backgroundColor !== "transparent" && backgroundColor !== "rgba(0, 0, 0, 0)") {
      return false;
    }
    
    // Check if element has any visible border (the triangle is made from borders)
    const borderInfo = this.getVisibleBorderSide(element);
    
    if (borderInfo) {
      console.log(`[Classifier] Triangle detected for ${element.id}! Direction: ${borderInfo.direction}, Color: ${borderInfo.color}, Width: ${borderInfo.width}px`);
      return true;
    }
    
    return false;
  }

  private getVisibleBorderSide(element: ParsedElement): { direction: string; color: string; width: number } | null {
    // CSS triangles have one solid colored border and transparent borders on other sides
    const { 
      borderTopWidth, borderRightWidth, borderBottomWidth, borderLeftWidth,
      borderTopColor, borderRightColor, borderBottomColor, borderLeftColor,
      borderTopStyle, borderRightStyle, borderBottomStyle, borderLeftStyle
    } = element.styles;

    const borders = [
      { side: 'top', width: borderTopWidth, color: borderTopColor, style: borderTopStyle, direction: 'down' },
      { side: 'right', width: borderRightWidth, color: borderRightColor, style: borderRightStyle, direction: 'left' },
      { side: 'bottom', width: borderBottomWidth, color: borderBottomColor, style: borderBottomStyle, direction: 'up' },
      { side: 'left', width: borderLeftWidth, color: borderLeftColor, style: borderLeftStyle, direction: 'right' },
    ];

    // Find the border that is solid and has a non-transparent color
    for (const border of borders) {
      if (!border.width || !border.color || !border.style) continue;
      
      const widthPx = parseFloat(border.width);
      const isSolid = border.style === 'solid';
      const isNotTransparent = border.color !== 'transparent' && 
                               border.color !== 'rgba(0, 0, 0, 0)' &&
                               !border.color.includes('transparent');
      
      if (widthPx > 0 && isSolid && isNotTransparent) {
        console.log(`[Classifier] Found visible border on ${border.side}: ${widthPx}px, ${border.color}`);
        return {
          direction: border.direction,
          color: border.color,
          width: widthPx,
        };
      }
    }

    return null;
  }

  private getTriangleBorderInfo(element: ParsedElement): { direction: string; color: string } {
    // This method is now deprecated in favor of getVisibleBorderSide
    const borderInfo = this.getVisibleBorderSide(element);
    return borderInfo || { direction: 'up', color: '#000000' };
  }

  private buildTableData(element: ParsedElement): TableData | null {
    if (element.tagName === "table") {
      return this.buildTableDataFromHTML(element);
    } else {
      return this.buildTableDataFromPseudoTable(element);
    }
  }

  private buildTableDataFromHTML(tableElement: ParsedElement): TableData | null {
    const rows: TableRow[] = [];
    let numCols = 0;
    let hasHeader = false;

    // Find thead and tbody
    let thead: ParsedElement | undefined;
    let tbody: ParsedElement | undefined;

    for (const child of tableElement.children) {
      if (child.tagName === "thead") {
        thead = child;
      } else if (child.tagName === "tbody") {
        tbody = child;
      } else if (child.tagName === "tr") {
        // Direct tr children (no thead/tbody)
        if (!tbody) {
          tbody = { ...child, tagName: "tbody", children: [child] } as ParsedElement;
        }
      }
    }

    // Process thead first
    if (thead) {
      for (const tr of thead.children) {
        if (tr.tagName === "tr") {
          const cells: TableCell[] = [];
          for (const cell of tr.children) {
            if (cell.tagName === "th" || cell.tagName === "td") {
              cells.push({
                text: cell.textContent.trim(),
                isHeader: true,
                styles: this.extractCellStyles(cell),
              });
            }
          }
          if (cells.length > 0) {
            rows.push({ cells });
            numCols = Math.max(numCols, cells.length);
            hasHeader = true;
          }
        }
      }
    }

    // Process tbody
    if (tbody) {
      for (const tr of tbody.children) {
        if (tr.tagName === "tr") {
          const cells: TableCell[] = [];
          for (const cell of tr.children) {
            if (cell.tagName === "th" || cell.tagName === "td") {
              cells.push({
                text: cell.textContent.trim(),
                isHeader: cell.tagName === "th" || (hasHeader === false && rows.length === 0),
                styles: this.extractCellStyles(cell),
              });
            }
          }
          if (cells.length > 0) {
            rows.push({ cells });
            numCols = Math.max(numCols, cells.length);
            if (!hasHeader && rows.length === 1) {
              hasHeader = true;
              // Mark first row as header
              rows[0].cells.forEach(cell => cell.isHeader = true);
            }
          }
        }
      }
    }

    if (rows.length === 0) {
      return null;
    }

    // Normalize column count - pad rows with empty cells if needed
    for (const row of rows) {
      while (row.cells.length < numCols) {
        row.cells.push({
          text: "",
          isHeader: row.cells[0]?.isHeader || false,
          styles: {},
        });
      }
    }

    return { rows, numCols };
  }

  private buildTableDataFromPseudoTable(container: ParsedElement): TableData | null {
    const rows: TableRow[] = [];
    let numCols = 0;

    // Each child is a row
    for (let rowIndex = 0; rowIndex < container.children.length; rowIndex++) {
      const rowElement = container.children[rowIndex];
      const cells: TableCell[] = [];

      // Each child of row is a cell
      for (const cellElement of rowElement.children) {
        cells.push({
          text: cellElement.textContent.trim(),
          isHeader: rowIndex === 0 || this.isHeaderCell(cellElement),
          styles: this.extractCellStyles(cellElement),
        });
      }

      if (cells.length > 0) {
        rows.push({ cells });
        numCols = Math.max(numCols, cells.length);
      }
    }

    if (rows.length === 0) {
      return null;
    }

    // Mark first row as header if it contains header-like cells
    if (rows.length > 0 && rows[0].cells.some(cell => cell.isHeader)) {
      rows[0].cells.forEach(cell => cell.isHeader = true);
    }

    // Normalize column count
    for (const row of rows) {
      while (row.cells.length < numCols) {
        row.cells.push({
          text: "",
          isHeader: row.cells[0]?.isHeader || false,
          styles: {},
        });
      }
    }

    return { rows, numCols };
  }

  private isHeaderCell(cell: ParsedElement): boolean {
    // Check class names
    const className = cell.tagName.toLowerCase();
    if (className.includes('label') || className.includes('header') || className.includes('th')) {
      return true;
    }

    // Check font weight
    const fontWeight = cell.styles.fontWeight;
    if (fontWeight && (fontWeight === "bold" || fontWeight === "700" || parseInt(fontWeight) >= 600)) {
      return true;
    }

    return false;
  }

  private extractCellStyles(cell: ParsedElement): any {
    // Extract basic styles for table cell
    const styles: any = {};

    if (cell.styles.backgroundColor) {
      styles.fill = this.convertColor(cell.styles.backgroundColor);
    }

    if (cell.styles.color) {
      styles.color = this.convertColor(cell.styles.color);
    }

    if (cell.styles.fontSize) {
      const px = parseFloat(cell.styles.fontSize);
      styles.fontSize = Math.round(px * 0.75); // Convert px to pt
    }

    if (cell.styles.fontFamily) {
      styles.fontFace = cell.styles.fontFamily.replace(/['"]/g, "").split(",")[0].trim();
    }

    if (cell.styles.fontWeight) {
      const weight = cell.styles.fontWeight.toLowerCase();
      styles.bold = weight === "bold" || weight === "bolder" || parseInt(weight) >= 600;
    }

    if (cell.styles.fontStyle === "italic") {
      styles.italic = true;
    }

    if (cell.styles.textAlign) {
      const align = cell.styles.textAlign.toLowerCase();
      if (align === "center" || align === "right" || align === "justify") {
        styles.align = align;
      } else {
        styles.align = "left";
      }
    }

    // Border styles
    if (cell.styles.borderWidth || cell.styles.borderTopWidth) {
      const borderWidth = cell.styles.borderTopWidth || cell.styles.borderWidth || "1px";
      const borderColor = cell.styles.borderTopColor || cell.styles.borderColor || "#000000";
      const borderStyle = cell.styles.borderTopStyle || cell.styles.borderStyle || "solid";
      
      styles.line = {
        color: this.convertColor(borderColor) || "000000",
        width: Math.max(1, Math.round(parseFloat(borderWidth) * 0.75)),
        dashType: borderStyle === "dashed" ? "dash" : borderStyle === "dotted" ? "dot" : "solid",
      };
    }

    return styles;
  }

  private convertColor(cssColor: string): string | undefined {
    if (!cssColor || cssColor === "transparent" || cssColor === "rgba(0, 0, 0, 0)") {
      return undefined;
    }

    // Handle rgb/rgba
    const rgbMatch = cssColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (rgbMatch) {
      const r = parseInt(rgbMatch[1]);
      const g = parseInt(rgbMatch[2]);
      const b = parseInt(rgbMatch[3]);
      return this.rgbToHex(r, g, b);
    }

    // Handle hex colors
    if (cssColor.startsWith("#")) {
      return cssColor.substring(1).toUpperCase();
    }

    // Handle named colors
    const namedColors: Record<string, string> = {
      black: "000000",
      white: "FFFFFF",
      red: "FF0000",
      green: "00FF00",
      blue: "0000FF",
      yellow: "FFFF00",
      cyan: "00FFFF",
      magenta: "FF00FF",
    };

    return namedColors[cssColor.toLowerCase()];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = n.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };
    return (toHex(r) + toHex(g) + toHex(b)).toUpperCase();
  }

  private getClassificationReason(element: ParsedElement, shapeType: PPTXShapeType): string {
    if (shapeType === "table") {
      if (element.tagName === "table") return "native HTML table";
      return "table-like structure (div-based)";
    }
    if (shapeType === "text") return "text tag or content-only";
    if (shapeType === "line") return "hr tag";
    if (shapeType === "ellipse") return "border-radius: 50% + equal dimensions";
    if (shapeType === "roundRect") return `border-radius: ${element.styles.borderRadius}`;
    if (shapeType === "triangle") return "border trick detected";
    return "default rectangle";
  }
}
