const imageInput = document.querySelector("#garment-upload");
const dropZone = document.querySelector("#drop-zone");
const emptyState = document.querySelector("#empty-state");
const previewState = document.querySelector("#preview-state");
const imagePreview = document.querySelector("#image-preview");
const fileName = document.querySelector("#file-name");
const chooseAgainButton = document.querySelector("#choose-again");
const analyzeButton = document.querySelector("#analyze-button");
const analysisPanel = document.querySelector("#analysis-panel");
const analysisStatus = document.querySelector("#analysis-status");
const analysisResults = document.querySelector("#analysis-results");

let currentImageUrl;
let selectedImage;
let dragDepth = 0;

const fieldLabels = {
  garment_name: "Garment name",
  estimated_era: "Estimated era",
  region: "Region",
  likely_wearer: "Likely wearer",
  materials: "Materials",
  notable_features: "Notable features",
  short_historical_context: "Historical context",
  confidence_note: "Confidence note",
};

function showImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
  }

  selectedImage = file;
  currentImageUrl = URL.createObjectURL(file);
  imagePreview.classList.remove("is-loaded");
  imagePreview.src = currentImageUrl;
  fileName.textContent = file.name;

  emptyState.setAttribute("aria-hidden", "true");
  previewState.setAttribute("aria-hidden", "false");
  dropZone.classList.add("has-image");
  analysisPanel.hidden = true;
  analysisStatus.textContent = "";
  analysisResults.replaceChildren();
}

function openFilePicker() {
  imageInput.value = "";
  imageInput.click();
}

function renderAnalysis(analysis) {
  analysisResults.replaceChildren();

  for (const [field, label] of Object.entries(fieldLabels)) {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    const value = analysis[field];

    item.className = "analysis-item";
    term.textContent = label;

    if (Array.isArray(value)) {
      const list = document.createElement("ul");

      for (const entry of value) {
        const listItem = document.createElement("li");
        listItem.textContent = entry;
        list.append(listItem);
      }

      description.append(list);
    } else {
      description.textContent = value;
    }

    item.append(term, description);
    analysisResults.append(item);
  }
}

imageInput.addEventListener("change", () => {
  showImage(imageInput.files[0]);
});

imagePreview.addEventListener("load", () => {
  imagePreview.classList.add("is-loaded");
});

dropZone.addEventListener("click", (event) => {
  if (!dropZone.classList.contains("has-image") && event.target !== imageInput) {
    openFilePicker();
  }
});

dropZone.addEventListener("keydown", (event) => {
  if ((event.key === "Enter" || event.key === " ") && !dropZone.classList.contains("has-image")) {
    event.preventDefault();
    openFilePicker();
  }
});

chooseAgainButton.addEventListener("click", (event) => {
  event.stopPropagation();
  openFilePicker();
});

analyzeButton.addEventListener("click", async (event) => {
  event.stopPropagation();

  if (!selectedImage) {
    return;
  }

  const formData = new FormData();
  formData.append("image", selectedImage);

  analysisPanel.hidden = false;
  analysisResults.replaceChildren();
  analysisStatus.textContent = "Analyzing the visible details…";
  analyzeButton.disabled = true;
  analyzeButton.textContent = "Analyzing…";

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The garment could not be analyzed.");
    }

    analysisStatus.textContent = "";
    renderAnalysis(result);
    analysisPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    analysisStatus.textContent = error.message;
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analyze garment";
  }
});

dropZone.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragDepth += 1;
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
});

dropZone.addEventListener("dragleave", () => {
  dragDepth -= 1;

  if (dragDepth === 0) {
    dropZone.classList.remove("is-dragging");
  }
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dragDepth = 0;
  dropZone.classList.remove("is-dragging");
  showImage(event.dataTransfer.files[0]);
});

window.addEventListener("beforeunload", () => {
  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
  }
});
