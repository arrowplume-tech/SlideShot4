import ElementsTree from "../ElementsTree";

export default function ElementsTreeExample() {
  const mockElements = [
    {
      id: "1",
      type: "div",
      pptxType: "roundRect",
      properties: {
        x: "0",
        y: "0",
        w: "100%",
        h: "200px",
        fill: "#667eea",
      },
      children: [
        {
          id: "2",
          type: "h1",
          pptxType: "text",
          properties: {
            text: "Hello World",
            fontSize: "24pt",
            color: "#ffffff",
          },
        },
        {
          id: "3",
          type: "p",
          pptxType: "text",
          properties: {
            text: "Description text",
            fontSize: "14pt",
            color: "#ffffff",
          },
        },
      ],
    },
  ];

  return <ElementsTree elements={mockElements} />;
}
