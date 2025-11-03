import { useState } from "react";
import CodeEditor from "../CodeEditor";

export default function CodeEditorExample() {
  const [code, setCode] = useState(`<div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; color: white;">
  <h1>Hello World</h1>
  <p>This is a test</p>
</div>`);

  return (
    <CodeEditor
      value={code}
      onChange={setCode}
      onClear={() => setCode("")}
    />
  );
}
