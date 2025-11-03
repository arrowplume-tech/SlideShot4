import { useState } from "react";
import Header from "@/components/Header";
import CodeEditor from "@/components/CodeEditor";
import LivePreview from "@/components/LivePreview";
import ElementsTree from "@/components/ElementsTree";
import ConversionLog, { LogEntry } from "@/components/ConversionLog";
import SettingsPanel from "@/components/SettingsPanel";
import { convertHtmlToPptx, downloadBlob, base64ToBlob } from "@/lib/conversion-api";
import { useToast } from "@/hooks/use-toast";

const TEMPLATES = {
  blank: "",
  card: `<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; color: white; max-width: 400px;">
  <h1 style="margin: 0 0 16px 0; font-size: 32px;">Card Title</h1>
  <p style="margin: 0; opacity: 0.9;">This is a beautiful gradient card component that will be converted to native PowerPoint shapes.</p>
</div>`,
  hero: `<div style="background: #1a1a2e; padding: 80px 40px; text-align: center; color: white;">
  <h1 style="font-size: 48px; margin: 0 0 24px 0;">Welcome to SlideShot</h1>
  <p style="font-size: 20px; margin: 0 0 32px 0; opacity: 0.8;">Convert HTML to PowerPoint with native elements</p>
  <div style="display: inline-block; background: #667eea; padding: 16px 32px; border-radius: 8px; font-weight: bold;">Get Started</div>
</div>`,
  pricing: `<div style="padding: 40px; background: #f5f5f5;">
  <h2 style="text-align: center; margin: 0 0 32px 0;">Pricing Plans</h2>
  <div style="display: flex; gap: 24px; justify-content: center;">
    <div style="background: white; padding: 32px; border-radius: 12px; border: 2px solid #667eea; flex: 1; max-width: 300px;">
      <h3 style="margin: 0 0 16px 0;">Basic</h3>
      <p style="font-size: 32px; font-weight: bold; margin: 0 0 24px 0;">$9<span style="font-size: 16px; font-weight: normal;">/mo</span></p>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 12px;">✓ 100 conversions/month</li>
        <li style="margin-bottom: 12px;">✓ Basic shapes</li>
        <li>✓ Email support</li>
      </ul>
    </div>
  </div>
</div>`,
};

export default function Home() {
  const { toast } = useToast();
  const [htmlCode, setHtmlCode] = useState(TEMPLATES.card);
  const [selectedTemplate, setSelectedTemplate] = useState("card");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [elements, setElements] = useState([
    {
      id: "1",
      type: "div",
      pptxType: "roundRect",
      properties: {
        x: "0",
        y: "0",
        w: "400px",
        h: "auto",
        fill: "linear-gradient",
        borderRadius: "12px",
      },
      children: [
        {
          id: "2",
          type: "h1",
          pptxType: "text",
          properties: {
            text: "Card Title",
            fontSize: "32pt",
            color: "#ffffff",
          },
        },
        {
          id: "3",
          type: "p",
          pptxType: "text",
          properties: {
            text: "Description...",
            fontSize: "14pt",
            color: "#ffffff",
          },
        },
      ],
    },
  ]);

  const [settings, setSettings] = useState({
    slideWidth: 10,
    slideHeight: 7.5,
    preserveImages: true,
    optimizeShapes: true,
    mergeTextBoxes: false,
    useBrowserLayout: true, // Use headless browser for accurate layout
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setHtmlCode(TEMPLATES[templateId as keyof typeof TEMPLATES] || "");
    addLog("info", `Template "${templateId}" loaded`);
  };

  const handleConvert = async () => {
    if (!htmlCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter some HTML code to convert",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    addLog("info", "Starting HTML to PowerPoint conversion...");

    try {
      const result = await convertHtmlToPptx(htmlCode, settings);
      
      // Add server logs to the UI
      result.logs.forEach(log => {
        addLog(log.level, log.message);
      });
      
      // Convert base64 to blob and download
      const blob = base64ToBlob(result.file);
      downloadBlob(blob, result.filename);
      addLog("info", `Downloaded: ${result.filename}`);
      
      toast({
        title: "Success!",
        description: "Your PowerPoint file has been downloaded",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Conversion failed";
      const errorDetails = error instanceof Error && (error as any).stack 
        ? (error as any).stack 
        : "";
      
      addLog("error", `Conversion failed: ${errorMessage}`);
      
      // Add more detailed logging for debugging
      if (errorDetails) {
        console.error("Conversion error details:", errorDetails);
        addLog("error", `Details: ${errorDetails.split('\n')[0]}`);
      }
      
      toast({
        title: "Conversion Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const addLog = (level: LogEntry["level"], message: string) => {
    const newLog: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message,
    };
    setLogs((prev) => [...prev, newLog]);
  };

  return (
    <div className="flex h-screen flex-col">
      <Header
        onSettingsClick={() => setIsSettingsOpen(true)}
        onConvert={handleConvert}
        onTemplateSelect={handleTemplateSelect}
        selectedTemplate={selectedTemplate}
        isConverting={isConverting}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r">
          <CodeEditor
            value={htmlCode}
            onChange={setHtmlCode}
            onClear={() => {
              setHtmlCode("");
              addLog("info", "Editor cleared");
            }}
          />
        </div>

        <div className="flex-1 border-r">
          <LivePreview
            html={htmlCode}
            onRefresh={() => addLog("info", "Preview refreshed")}
          />
        </div>

        <div className="w-80">
          <ElementsTree elements={elements} />
        </div>
      </div>

      <ConversionLog logs={logs} onClear={() => setLogs([])} />

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}
