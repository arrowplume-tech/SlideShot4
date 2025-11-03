import { useState } from "react";
import { ChevronRight, ChevronDown, Circle, Square, Type, Image } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ElementNode {
  id: string;
  type: string;
  pptxType: string;
  properties: Record<string, string>;
  children?: ElementNode[];
}

interface ElementsTreeProps {
  elements: ElementNode[];
}

function ElementTreeNode({ element }: { element: ElementNode }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = element.children && element.children.length > 0;

  const getIcon = (type: string) => {
    switch (type) {
      case "ellipse":
      case "circle":
        return <Circle className="h-4 w-4" />;
      case "rect":
      case "roundRect":
        return <Square className="h-4 w-4" />;
      case "text":
        return <Type className="h-4 w-4" />;
      case "image":
        return <Image className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover-elevate cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        data-testid={`tree-node-${element.id}`}
      >
        {hasChildren && (
          isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )
        )}
        {!hasChildren && <span className="w-3" />}
        {getIcon(element.pptxType)}
        <span className="text-xs font-mono">{element.pptxType}</span>
        <span className="text-xs text-muted-foreground">({element.type})</span>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-4 border-l pl-2">
          {element.children!.map((child) => (
            <ElementTreeNode key={child.id} element={child} />
          ))}
        </div>
      )}

      {isExpanded && Object.keys(element.properties).length > 0 && (
        <div className="ml-6 space-y-1 py-1">
          {Object.entries(element.properties).map(([key, value]) => (
            <div key={key} className="text-xs text-muted-foreground font-mono">
              {key}: {value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ElementsTree({ elements }: ElementsTreeProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandAll, setExpandAll] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Elements Tree
        </h2>
        <Input
          placeholder="Search elements..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9"
          data-testid="input-search-elements"
        />
      </div>

      <div className="flex-1 overflow-auto p-4">
        {elements.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No elements detected
          </div>
        ) : (
          <div className="space-y-1">
            {elements.map((element) => (
              <ElementTreeNode key={element.id} element={element} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
