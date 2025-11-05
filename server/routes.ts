import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ConversionPipeline } from "./lib/conversion-pipeline";
import { conversionRequestSchema } from "@shared/conversion-types";

export async function registerRoutes(app: Express): Promise<Server> {
  // POST /api/convert - Convert HTML to PowerPoint
  app.post("/api/convert", async (req, res) => {
    const pipeline = new ConversionPipeline();
    
    try {
      // Validate request body
      const validation = conversionRequestSchema.safeParse(req.body);
      
      if (!validation.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validation.error.message,
        });
      }

      const { html, options } = validation.data;

      // Ensure we have proper defaults (wide screen 16:9 - 33.87 cm x 19.05 cm = 13.333" x 7.5")
      const conversionOptions = {
        slideWidth: options?.slideWidth || 13.333,
        slideHeight: options?.slideHeight || 7.5,
        preserveImages: options?.preserveImages ?? true,
        optimizeShapes: options?.optimizeShapes ?? true,
        mergeTextBoxes: options?.mergeTextBoxes ?? false,
        useBrowserLayout: options?.useBrowserLayout ?? true,
      };

      // Run conversion pipeline
      console.log("[API] Starting conversion with options:", conversionOptions);
      const { buffer, logs } = await pipeline.convert(html, conversionOptions);
      console.log("[API] Conversion completed successfully, buffer size:", buffer.length);

      // Return JSON with logs and download info instead of direct binary
      // This allows the frontend to receive logs and then trigger download
      res.json({
        success: true,
        logs: logs.map(log => ({
          level: log.level,
          message: log.message,
          timestamp: log.timestamp.toISOString(),
        })),
        downloadUrl: `/api/convert/download/${Date.now()}`,
        filename: `slideshot-${Date.now()}.pptx`,
        file: buffer.toString("base64"),
      });
    } catch (error) {
      console.error("[API] Conversion error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : "";
      
      console.error("[API] Error stack:", errorStack);
      
      res.status(500).json({
        error: "Conversion failed",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined,
        timestamp: new Date().toISOString(),
      });
    } finally {
      await pipeline.cleanup();
      console.log("[API] Pipeline cleanup completed");
    }
  });

  // GET /api/convert/test - Test endpoint
  app.get("/api/convert/test", (req, res) => {
    res.json({ 
      status: "ok", 
      message: "SlideShot 2.0 API is running" 
    });
  });

  const httpServer = createServer(app);

  return httpServer;
}
