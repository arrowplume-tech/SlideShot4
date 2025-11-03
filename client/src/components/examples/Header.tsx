import Header from "../Header";

export default function HeaderExample() {
  return (
    <Header
      onSettingsClick={() => console.log("Settings clicked")}
      onConvert={() => console.log("Convert clicked")}
      onTemplateSelect={(id) => console.log("Template selected:", id)}
      selectedTemplate="blank"
    />
  );
}
