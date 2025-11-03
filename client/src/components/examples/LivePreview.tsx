import LivePreview from "../LivePreview";

export default function LivePreviewExample() {
  const sampleHtml = `
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 12px; color: white;">
      <h1 style="margin: 0 0 16px 0;">Hello World</h1>
      <p style="margin: 0;">This is a live preview of your HTML/CSS</p>
    </div>
  `;

  return (
    <LivePreview
      html={sampleHtml}
      onRefresh={() => console.log("Refresh preview")}
    />
  );
}
