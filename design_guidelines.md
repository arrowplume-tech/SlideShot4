# SlideShot 2.0 Design Guidelines

## Design Approach

**Selected Approach**: Design System - Linear/VS Code Inspired  
**Justification**: This is a developer-focused productivity tool requiring clarity, efficiency, and information density. The interface needs to support complex workflows (code editing, live preview, element inspection, conversion logs) while maintaining professional polish. Linear's clean typography and VS Code's panel-based layout provide the perfect foundation for this technical application.

**Core Principles**:
- Information clarity over decorative elements
- Efficient use of screen real estate for multi-panel workflows
- Clear visual hierarchy for technical content
- Consistent, predictable interaction patterns

---

## Layout System

### Primary Layout Structure
**Multi-Panel Application Layout** with resizable sections:

```
┌─────────────────────────────────────────────────┐
│ Header: Logo, Template Selector, Settings, CTA │
├──────────────┬────────────────┬─────────────────┤
│              │                │                 │
│  HTML/CSS    │  Live Preview  │  Elements Tree  │
│  Editor      │  (iframe)      │  Inspector      │
│  (40%)       │  (40%)         │  (20%)          │
│              │                │                 │
│              │                │                 │
├──────────────┴────────────────┴─────────────────┤
│         Conversion Log (Collapsible)            │
└─────────────────────────────────────────────────┘
```

### Spacing System
**Tailwind Units**: Use `2, 4, 6, 8, 12, 16` as primary spacing values
- Compact elements: `p-2, gap-2` (8px)
- Standard elements: `p-4, gap-4` (16px)
- Section spacing: `p-6, gap-6` (24px)
- Major sections: `p-8, gap-8` (32px)
- Large spacing: `p-12, p-16` (48px, 64px)

### Grid System
- Header: Fixed height `h-16` (64px)
- Main content: `flex-1` with `min-h-0` for proper scrolling
- Panel widths: Flexible with `resize` handles
- Conversion log: Collapsible, `h-48` when expanded (192px)

---

## Typography

### Font Families
**Primary Font**: Inter (via Google Fonts CDN)  
**Monospace Font**: JetBrains Mono (for code editor and logs)

### Type Scale
```
- Headings:
  H1 (Page Title): text-2xl font-semibold (24px)
  H2 (Panel Titles): text-lg font-semibold (18px)
  H3 (Section Headers): text-base font-semibold (16px)

- Body Text:
  Regular: text-sm (14px)
  Small: text-xs (12px)

- Code/Technical:
  Editor content: text-sm font-mono (14px)
  Log output: text-xs font-mono (12px)
  Element properties: text-xs font-mono (12px)
```

### Typography Hierarchy
- **Application Title**: text-xl font-bold tracking-tight
- **Panel Headers**: text-sm font-semibold uppercase tracking-wide
- **Button Labels**: text-sm font-medium
- **Body Content**: text-sm font-normal leading-relaxed
- **Helper Text**: text-xs opacity-70

---

## Component Library

### 1. Header Component
**Layout**: Full-width, fixed height (h-16), flex justify-between items-center px-6
- **Left**: Logo + "SlideShot 2.0" wordmark (text-lg font-bold)
- **Center**: Template dropdown selector (w-64)
- **Right**: Settings icon button + "Convert to PPTX" primary CTA button

### 2. Editor Panel
**Structure**:
- Panel header: text-sm font-semibold uppercase px-4 py-3
- Monaco-like code editor with:
  - Line numbers (w-12, text-right, opacity-50)
  - Syntax highlighting zones
  - Monospace font (JetBrains Mono)
  - Generous line-height (leading-relaxed)
- Controls bar below header: Font size selector, Format button, Clear button (h-10, gap-2)

### 3. Live Preview Panel
**Structure**:
- Panel header with refresh icon button
- Iframe container: w-full h-full with border (border rounded-sm)
- Dimension display: Bottom-right overlay showing viewport size (text-xs font-mono px-3 py-1 rounded-sm)
- Loading state: Centered spinner with "Rendering preview..."

### 4. Elements Tree Inspector
**Structure**:
- Collapsible tree view with indentation levels (pl-4 per level)
- Element nodes:
  - Icon (w-4 h-4) + Element type (text-xs font-mono) + Collapse arrow
  - Properties beneath when expanded (text-xs opacity-70)
- Expand/collapse all button in header
- Search filter input at top (h-9)

### 5. Conversion Log Panel
**Collapsible Bottom Panel**:
- Header with toggle: "Conversion Log" + Expand/Collapse chevron + Clear button
- Log entries:
  - Timestamp (text-xs opacity-50 font-mono)
  - Status icon (w-3 h-3): success (circle-check), warning (triangle-alert), error (circle-x)
  - Message (text-xs font-mono)
  - Entries grouped with subtle separators (border-t opacity-10)
- Auto-scroll to latest
- Max height when expanded: h-48, overflow-y-auto

### 6. Settings Panel (Modal/Drawer)
**Slide-in from right** (w-96):
- Header: "Conversion Settings" (text-lg font-semibold) + Close button
- Form sections with labels:
  - **Slide Dimensions**: Number inputs for width/height (w-20)
  - **Options**: Checkbox list (gap-3)
    - Preserve images
    - Optimize shapes
    - Merge text boxes
  - **Font Mapping**: Key-value pairs list with Add/Remove buttons
- Footer: Reset defaults + Apply buttons

### 7. Template Selector Dropdown
**Custom Dropdown**:
- Trigger: Button with "Templates" label + chevron-down (h-10 px-4 rounded-md)
- Menu: Absolute, w-80, max-h-96, overflow-y-auto
- Template items:
  - Template name (text-sm font-medium)
  - Preview thumbnail (h-20 rounded)
  - Description (text-xs opacity-70)
  - "Load" button on hover

### 8. Buttons

**Primary CTA** ("Convert to PPTX"):
- Large: px-6 py-3 text-base font-semibold rounded-lg
- Icon: Download icon (w-5 h-5) + label
- Full-width on mobile

**Secondary Actions**:
- Medium: px-4 py-2 text-sm font-medium rounded-md
- Examples: Settings, Format, Clear, Refresh

**Icon Buttons**:
- Square: w-10 h-10 rounded-md
- Icon size: w-5 h-5
- Usage: Close, Settings gear, Refresh

### 9. Panel Resize Handles
- Visual indicator: w-1, hover:w-2 with cursor-col-resize
- Draggable dividers between panels
- Minimum panel widths: 320px

### 10. Status Indicators
**Badge-style indicators**:
- Processing: Spinner + "Converting..." (text-xs px-2 py-1 rounded-full)
- Success: Check icon + "Ready to download" (text-xs px-2 py-1 rounded-full)
- Error: Alert icon + Error count (text-xs px-2 py-1 rounded-full)

---

## Component Specifications

### Form Elements
**Consistency across all inputs**:
- Text inputs: h-10 px-3 text-sm rounded-md border
- Number inputs: h-10 w-24 px-3 text-sm rounded-md border
- Checkboxes: w-4 h-4 rounded accent-primary
- Labels: text-sm font-medium mb-2 block
- Helper text: text-xs opacity-70 mt-1

### Loading States
- Skeleton screens for panel content during initial load
- Inline spinners for actions (w-4 h-4 animate-spin)
- Progress bar for conversion process (h-1 rounded-full)

### Error States
- Inline validation messages (text-xs mt-1)
- Error boundaries for panel failures
- Toast notifications for system errors (fixed bottom-4 right-4)

---

## Icons
**Library**: Heroicons (via CDN)  
**Usage**:
- Navigation: chevron-down, chevron-right, chevron-up
- Actions: cog-6-tooth (settings), arrow-path (refresh), x-mark (close)
- Status: check-circle, exclamation-triangle, x-circle
- File operations: arrow-down-tray (download), document-duplicate (copy)
- Editor: code-bracket, eye (preview), adjustments-horizontal (format)

---

## Responsive Behavior

### Desktop (lg: 1024px+)
- Full multi-panel layout as specified
- All panels visible simultaneously
- Resizable panel widths

### Tablet (md: 768px - 1023px)
- Two-panel layout: Editor + Preview (stacked or tabs)
- Elements tree as collapsible sidebar or tab
- Conversion log always collapsible

### Mobile (< 768px)
- Single panel view with tab navigation
- Tabs: Editor | Preview | Elements | Log
- Settings as full-screen modal
- Sticky header with hamburger menu

---

## Interaction Patterns

### Panel Interactions
- Click panel header to focus that panel
- Double-click resize handle to reset to default width
- Keyboard shortcuts for panel switching (Ctrl+1, Ctrl+2, Ctrl+3)

### Code Editor
- Tab key for indentation
- Ctrl+/ for line comment toggle
- Ctrl+S to trigger conversion
- Ctrl+F for find in editor

### Element Tree
- Click element to highlight in preview
- Right-click for context menu (Copy properties, View in preview)
- Keyboard navigation: Arrow keys to navigate, Enter to expand/collapse

### Conversion Flow
1. User enters/pastes HTML in editor
2. Live preview updates in real-time (debounced)
3. Elements tree populates automatically
4. User clicks "Convert to PPTX"
5. Conversion log shows progress
6. Download triggers automatically on success

---

## Accessibility
- All interactive elements keyboard accessible (tab order: header → panels left-to-right → log)
- Focus indicators visible on all controls (ring-2 ring-offset-2)
- ARIA labels for icon buttons
- Resizable panels maintain minimum widths for readability
- High contrast text ratios throughout
- Screen reader announcements for conversion status changes

---

## Special Considerations

### Code Editor Styling
- Comfortable character width: max 120 characters per line
- Padding around content: p-4
- Line height for readability: leading-loose (1.75)
- Clear distinction between line numbers and content

### Preview Iframe
- Isolated environment with seamless border integration
- Responsive scaling options (actual size, fit to panel)
- No scroll bars when content fits
- Clear loading indicator

### Element Tree Performance
- Virtualized list for 100+ elements
- Lazy rendering of collapsed branches
- Smooth expand/collapse animations (duration-200)

### Conversion Log
- Auto-scroll only when user is at bottom
- Timestamp grouping for related events
- Color-coded severity levels
- Copy all logs button for debugging

This design system ensures SlideShot 2.0 delivers a professional, efficient, and developer-friendly experience while maintaining visual polish and usability at scale.