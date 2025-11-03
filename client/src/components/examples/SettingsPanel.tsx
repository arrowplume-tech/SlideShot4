import { useState } from "react";
import SettingsPanel from "../SettingsPanel";
import { Button } from "@/components/ui/button";

export default function SettingsPanelExample() {
  const [isOpen, setIsOpen] = useState(true);
  const [settings, setSettings] = useState({
    slideWidth: 10,
    slideHeight: 7.5,
    preserveImages: true,
    optimizeShapes: true,
    mergeTextBoxes: false,
  });

  return (
    <div className="relative h-screen">
      <Button onClick={() => setIsOpen(true)}>Open Settings</Button>
      <SettingsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}
