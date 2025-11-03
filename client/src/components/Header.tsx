import { Settings, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HeaderProps {
  onSettingsClick: () => void;
  onConvert: () => void;
  onTemplateSelect: (templateId: string) => void;
  selectedTemplate?: string;
  isConverting?: boolean;
}

export default function Header({
  onSettingsClick,
  onConvert,
  onTemplateSelect,
  selectedTemplate,
  isConverting = false,
}: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b px-6 bg-background">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <span className="text-lg font-bold text-primary-foreground">S</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight">SlideShot 2.0</h1>
      </div>

      <div className="flex items-center gap-3">
        <Select value={selectedTemplate} onValueChange={onTemplateSelect}>
          <SelectTrigger className="w-64" data-testid="select-template">
            <SelectValue placeholder="Select a template" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="blank">Blank</SelectItem>
            <SelectItem value="card">Card Component</SelectItem>
            <SelectItem value="hero">Hero Section</SelectItem>
            <SelectItem value="pricing">Pricing Table</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          data-testid="button-settings"
        >
          <Settings className="h-5 w-5" />
        </Button>

        <Button
          onClick={onConvert}
          disabled={isConverting}
          className="gap-2"
          data-testid="button-convert"
        >
          <Download className="h-5 w-5" />
          {isConverting ? "Converting..." : "Convert to PPTX"}
        </Button>
      </div>
    </header>
  );
}
