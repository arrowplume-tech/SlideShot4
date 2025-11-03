import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    slideWidth: number;
    slideHeight: number;
    preserveImages: boolean;
    optimizeShapes: boolean;
    mergeTextBoxes: boolean;
    useBrowserLayout: boolean;
  };
  onSettingsChange: (settings: SettingsPanelProps["settings"]) => void;
}

export default function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  if (!isOpen) return null;

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        onClick={onClose}
        data-testid="overlay-settings"
      />
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-background border-l z-50 flex flex-col">
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h2 className="text-lg font-semibold">Conversion Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-settings"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Slide Dimensions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="width">Width (inches)</Label>
                <Input
                  id="width"
                  type="number"
                  value={settings.slideWidth}
                  onChange={(e) =>
                    updateSetting("slideWidth", Number(e.target.value))
                  }
                  className="w-full"
                  data-testid="input-slide-width"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (inches)</Label>
                <Input
                  id="height"
                  type="number"
                  value={settings.slideHeight}
                  onChange={(e) =>
                    updateSetting("slideHeight", Number(e.target.value))
                  }
                  className="w-full"
                  data-testid="input-slide-height"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Options</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="preserve-images"
                  checked={settings.preserveImages}
                  onCheckedChange={(checked) =>
                    updateSetting("preserveImages", checked === true)
                  }
                  data-testid="checkbox-preserve-images"
                />
                <Label htmlFor="preserve-images" className="cursor-pointer">
                  Preserve images
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="optimize-shapes"
                  checked={settings.optimizeShapes}
                  onCheckedChange={(checked) =>
                    updateSetting("optimizeShapes", checked === true)
                  }
                  data-testid="checkbox-optimize-shapes"
                />
                <Label htmlFor="optimize-shapes" className="cursor-pointer">
                  Optimize shapes
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="merge-textboxes"
                  checked={settings.mergeTextBoxes}
                  onCheckedChange={(checked) =>
                    updateSetting("mergeTextBoxes", checked === true)
                  }
                  data-testid="checkbox-merge-textboxes"
                />
                <Label htmlFor="merge-textboxes" className="cursor-pointer">
                  Merge text boxes
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="use-browser-layout"
                  checked={settings.useBrowserLayout}
                  onCheckedChange={(checked) =>
                    updateSetting("useBrowserLayout", checked === true)
                  }
                  data-testid="checkbox-use-browser-layout"
                />
                <Label htmlFor="use-browser-layout" className="cursor-pointer">
                  Use browser-based layout (recommended)
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t p-6">
          <Button
            variant="outline"
            onClick={() => {
              onSettingsChange({
                slideWidth: 10,
                slideHeight: 7.5,
                preserveImages: true,
                optimizeShapes: true,
                mergeTextBoxes: false,
                useBrowserLayout: true,
              });
            }}
            data-testid="button-reset-defaults"
          >
            Reset to Defaults
          </Button>
          <Button onClick={onClose} data-testid="button-apply-settings">
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}
