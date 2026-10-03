import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import OpenAI, { toFile } from "openai";

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
    hotspots: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          x: { type: "number", minimum: 0, maximum: 100 },
          y: { type: "number", minimum: 0, maximum: 100 },
          description: { type: "string" },
        },
        required: ["label", "x", "y", "description"],
        additionalProperties: false,
      },
    },
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
    "hotspots",
  ],
  additionalProperties: false,
};

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
      model: "gpt-5.6-terra",
      store: false,
      instructions:
        "You are a careful historical clothing researcher. Keep every field concise. Base claims only on visible evidence and general historical knowledge. Clearly state uncertainty when era, region, wearer, or material cannot be determined from the image alone. Never invent provenance or ownership. For hotspots, identify approximately 3 to 5 clearly visible garment details when available, but return fewer if the image does not support that many. Never create a hotspot for an obscured, inferred, or background detail. Set x as the detail's center from left to right and y from top to bottom, both as percentages of the original image.",
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

app.post("/api/reconstruct", upload.single("image"), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: "Please upload a valid image." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return response.status(500).json({ error: "The server is missing its OpenAI API key." });
  }

  const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  if (!supportedImageTypes.has(request.file.mimetype)) {
    return response.status(400).json({ error: "Reconstruction requires a JPG, PNG, or WEBP image." });
  }

  let analysis;

  try {
    analysis = JSON.parse(request.body.analysis);
  } catch {
    return response.status(400).json({ error: "The garment analysis is missing or invalid." });
  }

  const hasRequiredAnalysis =
    analysis &&
    typeof analysis === "object" &&
    !Array.isArray(analysis) &&
    garmentSchema.required.every((field) => Object.hasOwn(analysis, field));

  if (!hasRequiredAnalysis) {
    return response.status(400).json({ error: "Complete garment analysis is required." });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const referenceImage = await toFile(request.file.buffer, request.file.originalname, {
      type: request.file.mimetype,
    });
    const prompt = `
Create exactly one historically informed, photorealistic full-length museum reconstruction of an anonymous person wearing the garment shown in the reference image.

The garment in the reference image is the primary visual authority. Preserve its visible silhouette, proportions, pattern, colors, neckline, sleeves, waist construction, skirt or lower-body shape, trim, fastenings, and other identifiable details as closely as reasonably possible. Adapt the displayed garment naturally onto a human body without redesigning or modernizing it.

Use the analysis below only to guide a historically plausible wearer, restrained styling, and a simple period-appropriate or neutral museum setting. Treat uncertain claims as uncertain. Do not invent a specific owner, named person, exact date, social status, location, accessories, or ceremonial meaning unless clearly supported. Avoid fantasy styling, theatrical costumes, modern fashion reinterpretation, text, captions, logos, and watermarks.

Keep the garment clearly visible from head to toe with calm archival lighting and an uncluttered composition.

Garment analysis:
${JSON.stringify(analysis, null, 2)}
`.trim();

    const imageResponse = await openai.images.edit({
      model: "gpt-image-2.5-flare",
      image: referenceImage,
      prompt,
      n: 1,
      quality: "low",
      size: "1024x1536",
      output_format: "jpeg",
      output_compression: 85,
      background: "opaque",
    });

    const generatedImage = imageResponse.data?.[0]?.b64_json;

    if (!generatedImage) {
      throw new Error("The image API returned no image data.");
    }

    return response.json({ image: `data:image/jpeg;base64,${generatedImage}` });
  } catch (error) {
    console.error("Worn reconstruction failed:", error.message);
    return response.status(500).json({ error: "The worn reconstruction could not be generated. Please try again." });
  }
});

app.use("/api", (request, response) => {
  return response.status(404).json({ error: "API endpoint not found." });
});

app.use((error, request, response, next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(400).json({ error: "Please choose an image smaller than 10 MB." });
  }

  console.error("Server error:", error);
  return response.status(500).json({ error: "Something went wrong on the server." });
});

app.use(express.static(projectDirectory, { dotfiles: "deny" }));

app.listen(port, () => {
  console.log(`Threads of History is running at http://localhost:${port}`);
});
