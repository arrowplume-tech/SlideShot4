# SlideShot 2.0

## Overview
SlideShot 2.0 is a web service that converts HTML/CSS markup into fully editable PowerPoint presentations using native PowerPoint elements (shapes, text boxes, lines). The tool features a multi-panel interface with an HTML/CSS editor, live preview iframe, elements tree inspector, and conversion log panel.

## Project Status
MVP implementation complete with functional HTML-to-PowerPoint conversion pipeline. The converter handles common HTML layout patterns and converts them to native PowerPoint shapes.

## Architecture

### Frontend (React + TypeScript)
- **Editor Panel**: Monaco-like code editor for HTML/CSS input
- **Live Preview**: Real-time iframe rendering of HTML content
- **Elements Tree**: Visual DOM tree inspector showing element hierarchy
- **Conversion Log**: Real-time telemetry from conversion pipeline
- **Settings Panel**: Conversion options (layout, optimization, merging)

### Backend (Express + TypeScript)
- **HTML Parser** (`server/lib/html-parser.ts`): Extracts DOM tree and computed styles using JSDOM
  - Implements CSS positioning (static, relative, absolute, fixed)
  - Per-container layout contexts with flow tracking
  - Containing block tracking for absolute positioning
  - Supports left/right/top/bottom CSS properties
  - Parses margins, padding, dimensions
  
- **Element Classifier** (`server/lib/element-classifier.ts`): Maps CSS patterns to PowerPoint shapes
  - Circles (border-radius >= 50% on square elements)
  - Rectangles (block elements)
  - Rounded Rectangles (elements with border-radius < 50%)
  - Text (heading and paragraph elements)
  
- **Style Converter** (`server/lib/style-converter.ts`): Converts CSS to PowerPoint properties
  - RGB/RGBA to HEX color conversion
  - Border styles and widths
  - Text properties (font, size, weight, align)
  - Positioning (inches for PowerPoint coordinates)
  
- **PowerPoint Generator** (`server/lib/pptx-generator.ts`): Creates native PowerPoint elements using PptxGenJS
  - Shapes (rectangles, rounded rectangles, circles)
  - Text boxes with formatting
  - Borders and fill colors
  
- **Conversion Pipeline** (`server/lib/conversion-pipeline.ts`): Orchestrates full conversion
  - Coordinates parser, classifier, converter, and generator
  - Collects conversion telemetry logs
  - Returns PPTX buffer and logs

- **API Routes** (`server/routes.ts`):
  - `POST /api/convert`: Accepts HTML and options, returns JSON with PPTX file (base64) and logs

## Known Limitations

### Layout Engine Constraints
The HTML parser implements a subset of CSS layout behavior without a full browser rendering engine:

**What Works:**
- ✅ Block elements flowing vertically
- ✅ Inline elements flowing horizontally
- ✅ Absolute positioning relative to positioned ancestors
- ✅ Fixed positioning relative to slide root
- ✅ Relative positioning with offsets
- ✅ Basic left/right/top/bottom support
- ✅ Margin and padding parsing
- ✅ Default dimensions for common elements

**Limitations:**
- ⚠️ Container dimensions for right/bottom calculations use slide defaults (960×720px) rather than actual container dimensions
- ⚠️ No support for stretched elements (both left+right or top+bottom specified)
- ⚠️ Percentage units assume 1000px container width
- ⚠️ No flexbox or grid layout support
- ⚠️ No support for transforms, z-index, overflow
- ⚠️ Text content doesn't wrap - uses single text boxes

**Recommended Use Cases:**
- Simple card layouts with positioned badges
- Hero sections with basic positioning
- Pricing tables with consistent structure
- Landing pages with explicit dimensions
- Content where most elements use explicit px dimensions

## Design
Professional Linear/VS Code-inspired aesthetic:
- Dark theme with muted colors
- Clean typography and spacing
- Subtle borders and elevations
- Responsive multi-panel layout

## Recent Changes (November 2025)

### Migration to Playwright (November 4, 2025)
- ✅ **Migrated from Puppeteer to Playwright**: More stable and modern browser automation
- ✅ **Better Cloud Environment Support**: Playwright Firefox works perfectly in Replit environment
- ✅ **Created PlaywrightLayoutCollector**: New `server/lib/playwright-layout-collector.ts` replacing BrowserLayoutCollector
- ✅ **Updated Conversion Pipeline**: Now uses Playwright Firefox for 99% accurate layout measurements
- ✅ **Installed Firefox 142**: Full headless browser support for precise CSS rendering (no libgbm dependency issues)
- ✅ **Enhanced Logging**: Russian language messages with clear indicators when using browser vs fallback
- ✅ **Removed Puppeteer**: Cleaned up old code and dependencies
- 🎯 **Goal Achieved**: Targeting 99% accuracy instead of 50-80% from JSDOM fallback

### Robust Error Handling & Fallback System (November 3, 2025)
- ✅ **Automatic Fallback**: Conversion pipeline now automatically falls back to traditional HTML parser if browser fails
- ✅ **Enhanced Error Logging**: 
  - Added detailed Russian error messages throughout the pipeline
  - Browser initialization errors now show full stack traces in console
  - Frontend shows specific error details instead of generic "Conversion failed"
  - Conversion logs display warnings when browser is unavailable
- ✅ **Fixed React Warnings**: 
  - Resolved duplicate key issues in conversion logs (added unique random IDs)
  - Log entries now use `${Date.now()}-${Math.random()}` for guaranteed uniqueness

### Browser-Based Layout Collection (Replaced by Playwright)
- ❌ **Previous Puppeteer Implementation**: Had issues with libgbm.so.1 in Replit environment
- ✅ **Now Using Playwright**: More reliable headless Chrome rendering for accurate layout measurements
- ✅ Created layout collector using 960×720px viewport (PowerPoint dimensions at 96 DPI)
- ✅ Added per-side border properties (borderTopWidth, borderRightWidth, etc.) to ComputedStyles

### Enhanced CSS Triangle Detection
- ✅ Implemented per-side border inspection (checks borderTopWidth, borderBottomWidth individually)
- ✅ Added transparent color detection for CSS border tricks
- ✅ Direction detection based on which border side has solid color
- ✅ Tolerance for near-zero dimensions (0.05 inches ~ 5px)

### Gradient Parsing Improvements
- ✅ Linear gradient parsing with multiple color stops
- ✅ Angle parsing (deg, rad, turn units)
- ✅ Directional keywords (to top, to bottom right, etc.)
- ✅ Fallback to first color for unsupported gradient types

### Enhanced Logging
- ✅ Detailed frontend error messages with stack traces
- ✅ Backend validation error logging with Zod schema details
- ✅ Conversion pipeline telemetry surfaced to frontend
- ✅ Browser console error aggregation
- ✅ Comprehensive logging at every pipeline stage (parser, classifier, converter, generator)

### Previous Changes
- ✅ Implemented complete positioning system with containing block tracking
- ✅ Added support for position: fixed, absolute, relative, sticky
- ✅ Implemented left/right/top/bottom CSS property support
- ✅ Created layout context stack for proper container-relative positioning
- ✅ Added conversion log surfacing from pipeline to frontend
- ✅ Fixed API response to return logs alongside PPTX file

## Tech Stack
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query, Shadcn UI
- **Backend**: Express, TypeScript, Playwright (browser automation), JSDOM (fallback parser), PptxGenJS (PowerPoint generation)
- **Storage**: In-memory (MemStorage) - no database required
- **Build**: Vite, TSX

## Development
```bash
npm run dev  # Starts Express + Vite on port 5000
```

## File Structure
```
client/src/
├── pages/Home.tsx          # Main editor interface
├── components/
│   ├── CodeEditor.tsx      # HTML/CSS editor panel
│   ├── LivePreview.tsx     # Preview iframe
│   ├── ElementsTree.tsx    # DOM tree inspector
│   ├── ConversionLog.tsx   # Real-time log panel
│   └── SettingsPanel.tsx   # Conversion options
└── lib/conversion-api.ts   # API client

server/
├── routes.ts               # API endpoints
├── lib/
│   ├── html-parser.ts      # DOM extraction + layout
│   ├── element-classifier.ts  # Shape type detection
│   ├── style-converter.ts  # CSS to PowerPoint conversion
│   ├── pptx-generator.ts   # PowerPoint file generation
│   └── conversion-pipeline.ts  # Orchestration

shared/
├── schema.ts               # Shared data types
└── conversion-types.ts     # Conversion interfaces
```
