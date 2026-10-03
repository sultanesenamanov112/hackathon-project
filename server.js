import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import OpenAI from "openai";

const app = express();
const port = process.env.PORT || 3000;
const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    callback(null, file.mimetype.startsWith("image/"));
  },
});

const garmentSchema = {
  type: "object",
  properties: {
    garment_name: { type: "string" },
    estimated_era: { type: "string" },
    region: { type: "string" },
    likely_wearer: { type: "string" },
    materials: {
      type: "array",
      items: { type: "string" },
    },
    notable_features: {
      type: "array",
      items: { type: "string" },
    },
    short_historical_context: { type: "string" },
    confidence_note: { type: "string" },
  },
  required: [
    "garment_name",
    "estimated_era",
    "region",
    "likely_wearer",
    "materials",
    "notable_features",
    "short_historical_context",
    "confidence_note",
  ],
  additionalProperties: false,
};

app.use(express.static(projectDirectory, { dotfiles: "deny" }));

app.post("/api/analyze", upload.single("image"), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: "Please upload a valid image." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({ error: "The server is missing its OpenAI API key." });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const imageDataUrl = `data:${request.file.mimetype};base64,${request.file.buffer.toString("base64")}`;

    const aiResponse = await openai.responses.create({
      model: "gpt-4o-mini",
      store: false,
      instructions:
        "You are a careful historical clothing researcher. Keep every field concise. Base claims only on visible evidence and general historical knowledge. Clearly state uncertainty when era, region, wearer, or material cannot be determined from the image alone. Never invent provenance or ownership.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyze this garment photograph and return the requested structured identification.",
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
              detail: "auto",
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "garment_analysis",
          strict: true,
          schema: garmentSchema,
        },
      },
    });

    const analysis = JSON.parse(aiResponse.output_text);
    return response.json(analysis);
  } catch (error) {
    console.error("Garment analysis failed:", error.message);
    return response.status(500).json({ error: "The garment could not be analyzed. Please try again." });
  }
});

app.use((error, request, response, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(400).json({ error: "Please choose an image smaller than 10 MB." });
  }

  console.error("Server error:", error);
  return response.status(500).json({ error: "Something went wrong on the server." });
});

app.listen(port, () => {
  console.log(`Threads of History is running at http://localhost:${port}`);
});
