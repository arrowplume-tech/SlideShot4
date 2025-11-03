import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ConversionPipeline } from "./lib/conversion-pipeline";
import { conversionRequestSchema } from "@shared/conversion-types";

export async function registerRoutes(app: Express): Promise<Server> {
  // POST /api/convert - Convert HTML to PowerPoint
  app.post("/api/convert", async (req, res) => {
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

      // Ensure we have proper defaults
      const conversionOptions = {
        slideWidth: options?.slideWidth || 10,
        slideHeight: options?.slideHeight || 7.5,
        preserveImages: options?.preserveImages ?? true,
        optimizeShapes: options?.optimizeShapes ?? true,
        mergeTextBoxes: options?.mergeTextBoxes ?? false,
      };

      // Run conversion pipeline
      console.log("[API] Starting conversion with options:", conversionOptions);
      const pipeline = new ConversionPipeline();
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
        // Encode buffer as base64 for JSON transport
        file: buffer.toString("base64"),
      });
    } catch (error) {
      console.error("Conversion error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Conversion failed",
        details: errorMessage,
      });
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
