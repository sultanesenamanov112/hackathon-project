const imageInput = document.querySelector("#garment-upload");
const dropZone = document.querySelector("#drop-zone");
const emptyState = document.querySelector("#empty-state");
const previewState = document.querySelector("#preview-state");
const imagePreview = document.querySelector("#image-preview");
const fileName = document.querySelector("#file-name");
const chooseAgainButton = document.querySelector("#choose-again");
const analyzeButton = document.querySelector("#analyze-button");
const uploadSection = document.querySelector("#upload");
const analysisPanel = document.querySelector("#analysis-panel");
const analysisIntro = document.querySelector("#analysis-intro");
const analysisStatus = document.querySelector("#analysis-status");
const guidedExhibit = document.querySelector("#guided-exhibit");
const artifactFrame = document.querySelector("#artifact-frame");
const artifactMedia = document.querySelector("#artifact-media");
const artifactSpotlight = document.querySelector("#artifact-spotlight");
const hotspotLayer = document.querySelector("#hotspot-layer");
const hotspotDetail = document.querySelector("#hotspot-detail");
const hotspotTitle = document.querySelector("#hotspot-title");
const hotspotDescription = document.querySelector("#hotspot-description");
const revealCard = document.querySelector("#reveal-card");
const revealNumber = document.querySelector("#reveal-number");
const revealTitle = document.querySelector("#reveal-title");
const revealCopy = document.querySelector("#reveal-copy");
const revealBackButton = document.querySelector("#reveal-back");
const revealNextButton = document.querySelector("#reveal-next");
const revealControls = document.querySelector("#reveal-controls");
const revealCompletion = document.querySelector("#reveal-completion");
const exploreButton = document.querySelector("#explore-button");
const findingTabs = [...document.querySelectorAll(".chapter-button")];
const experienceObject = document.querySelector("#experience-object");
const experienceReset = document.querySelector("#experience-reset");
const progressLabel = document.querySelector("#progress-label");
const progressFill = document.querySelector("#progress-fill");
const reconstructButton = document.querySelector("#reconstruct-button");
const reconstructionStatus = document.querySelector("#reconstruction-status");
const reconstructionError = document.querySelector("#reconstruction-error");
const generationState = document.querySelector("#generation-state");
const viewToggle = document.querySelector("#view-toggle");
const displayedViewButton = document.querySelector("#displayed-view");
const wornViewButton = document.querySelector("#worn-view");
const displayedImage = document.querySelector("#displayed-image");
const exhibitImage = displayedImage;
const wornImage = document.querySelector("#worn-image");
const stageCaptionLabel = document.querySelector("#stage-caption-label");
const stageFileName = document.querySelector("#stage-file-name");

let currentImageUrl;
let selectedImage;
let currentAnalysis;
let dragDepth = 0;
let currentRevealStep = 0;
let revealComplete = false;
let activeHotspotIndex = -1;
let revealTransitioning = false;

const revealSteps = [
  { number: "01", title: "Identity" },
  { number: "02", title: "Time & Place" },
  { number: "03", title: "Who Wore It" },
  { number: "04", title: "Construction" },
  { number: "05", title: "Historical Context" },
];

function showImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  const returningFromExhibit = uploadSection.classList.contains("is-exhibit-mode");

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
  dropZone.hidden = false;
  dropZone.classList.remove("is-departing");
  uploadSection.classList.remove("is-exhibit-mode");
  currentAnalysis = undefined;
  analysisPanel.hidden = true;
  analysisIntro.hidden = false;
  analysisStatus.textContent = "";
  guidedExhibit.hidden = true;
  guidedExhibit.classList.remove("is-exploring", "is-revealed");
  hotspotLayer.replaceChildren();
  hotspotDetail.hidden = true;
  revealCompletion.hidden = true;
  exploreButton.hidden = false;
  revealControls.hidden = false;
  currentRevealStep = 0;
  revealComplete = false;
  activeHotspotIndex = -1;
  reconstructButton.hidden = false;
  reconstructionStatus.textContent = "";
  reconstructionError.textContent = "";
  generationState.hidden = true;
  viewToggle.hidden = true;
  artifactFrame.classList.remove("is-focused", "is-generating", "is-worn", "is-transitioning");
  artifactMedia.style.removeProperty("--focus-x");
  artifactMedia.style.removeProperty("--focus-y");
  artifactMedia.style.removeProperty("--pan-x");
  artifactMedia.style.removeProperty("--pan-y");
  displayedImage.removeAttribute("src");
  wornImage.removeAttribute("src");

  if (returningFromExhibit) {
    window.setTimeout(() => {
      dropZone.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }
}

function openFilePicker() {
  imageInput.value = "";
  imageInput.click();
}

function createFact(label, value, emphasis = false) {
  const fact = document.createElement("div");
  const factLabel = document.createElement("p");
  const factValue = document.createElement("p");

  fact.className = emphasis ? "reveal-fact is-emphasized" : "reveal-fact";
  factLabel.className = "reveal-fact-label";
  factValue.className = "reveal-fact-value";
  factLabel.textContent = label;
  factValue.textContent = value;
  fact.append(factLabel, factValue);
  return fact;
}

function createListFact(label, values) {
  const fact = document.createElement("div");
  const factLabel = document.createElement("p");
  const list = document.createElement("ul");

  fact.className = "reveal-fact";
  factLabel.className = "reveal-fact-label";
  factLabel.textContent = label;

  for (const value of values) {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  }

  fact.append(factLabel, list);
  return fact;
}

function buildStepContent(step) {
  const fragment = document.createDocumentFragment();

  if (step === 0) {
    fragment.append(createFact("Identified as", currentAnalysis.garment_name, true));
  } else if (step === 1) {
    fragment.append(
      createFact("Estimated era", currentAnalysis.estimated_era),
      createFact("Associated region", currentAnalysis.region),
    );
  } else if (step === 2) {
    fragment.append(createFact("Likely wearer", currentAnalysis.likely_wearer, true));
  } else if (step === 3) {
    fragment.append(
      createListFact("Likely materials", currentAnalysis.materials),
      createListFact("Visible construction", currentAnalysis.notable_features),
    );
  } else {
    fragment.append(
      createFact("Historical context", currentAnalysis.short_historical_context, true),
      createFact("What remains uncertain", currentAnalysis.confidence_note),
    );
  }

  return fragment;
}

function positionHotspotLayer() {
  if (!exhibitImage.naturalWidth || !exhibitImage.naturalHeight) {
    return;
  }

  const frame = artifactMedia.getBoundingClientRect();
  const imageRatio = exhibitImage.naturalWidth / exhibitImage.naturalHeight;
  const frameRatio = frame.width / frame.height;
  let width = frame.width;
  let height = frame.height;
  let left = 0;
  let top = 0;

  if (imageRatio > frameRatio) {
    height = width / imageRatio;
    top = (frame.height - height) / 2;
  } else {
    width = height * imageRatio;
    left = (frame.width - width) / 2;
  }

  hotspotLayer.style.left = `${left}px`;
  hotspotLayer.style.top = `${top}px`;
  hotspotLayer.style.width = `${width}px`;
  hotspotLayer.style.height = `${height}px`;
}

function selectHotspot(index) {
  const hotspot = currentAnalysis?.hotspots?.[index];

  if (!hotspot) {
    activeHotspotIndex = -1;
    hotspotDetail.hidden = true;
    return;
  }

  activeHotspotIndex = index;
  hotspotTitle.textContent = hotspot.label;
  hotspotDescription.textContent = hotspot.description;
  hotspotDetail.hidden = false;
  artifactMedia.style.setProperty("--focus-x", `${hotspot.x}%`);
  artifactMedia.style.setProperty("--focus-y", `${hotspot.y}%`);
  artifactMedia.style.setProperty("--pan-x", `${(50 - hotspot.x) * 0.32}px`);
  artifactMedia.style.setProperty("--pan-y", `${(50 - hotspot.y) * 0.24}px`);
  artifactFrame.classList.add("is-focused");

  for (const [markerIndex, marker] of [...hotspotLayer.children].entries()) {
    const selected = markerIndex === index;
    marker.classList.toggle("is-active", selected);
    marker.setAttribute("aria-pressed", String(selected));
  }
}

function renderHotspots() {
  hotspotLayer.replaceChildren();
  const hotspots = Array.isArray(currentAnalysis.hotspots) ? currentAnalysis.hotspots : [];

  hotspots.forEach((hotspot, index) => {
    const marker = document.createElement("button");
    const x = Math.min(100, Math.max(0, Number(hotspot.x)));
    const y = Math.min(100, Math.max(0, Number(hotspot.y)));

    marker.type = "button";
    marker.className = "hotspot-marker";
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    marker.setAttribute("aria-label", hotspot.label);
    marker.setAttribute("aria-pressed", "false");
    const markerLabel = document.createElement("span");
    markerLabel.textContent = hotspot.label;
    marker.append(markerLabel);
    marker.addEventListener("click", () => {
      if (revealComplete || currentRevealStep >= 3) {
        selectHotspot(index);
      }
    });
    hotspotLayer.append(marker);
  });

  positionHotspotLayer();
}

function completeReveal() {
  if (revealComplete) {
    return;
  }

  revealComplete = true;
  revealControls.hidden = true;
  revealCompletion.hidden = false;
  hotspotLayer.classList.add("is-visible", "is-explorable");
  guidedExhibit.classList.add("is-revealed");

  if (currentAnalysis.hotspots?.length && activeHotspotIndex < 0) {
    selectHotspot(0);
  }
}

function renderRevealStep(step, immediate = false) {
  currentRevealStep = step;
  revealTransitioning = !immediate;
  analysisPanel.dataset.atmosphere = String(step + 1);
  revealCard.classList.remove("is-visible");
  artifactFrame.classList.remove("is-transitioning");
  artifactMedia.style.setProperty("--chapter-scale", String(1 + step * 0.008));
  progressLabel.textContent = `Discovery ${String(step + 1).padStart(2, "0")} of 05`;
  progressFill.style.width = `${((step + 1) / revealSteps.length) * 100}%`;
  requestAnimationFrame(() => artifactFrame.classList.add("is-transitioning"));

  const updateContent = () => {
    const revealStep = revealSteps[step];
    revealNumber.textContent = `${revealStep.number} —`;
    revealTitle.textContent = revealStep.title;
    revealCopy.replaceChildren(buildStepContent(step));

    findingTabs.forEach((tab, index) => {
      tab.classList.toggle("is-active", index === step);
      tab.classList.toggle("is-visited", index <= step || revealComplete);
    });

    if (!revealComplete) {
      revealBackButton.hidden = step === 0;
      revealNextButton.textContent = step === 3 ? "Continue to context" : "Continue";
    }

    if (step === 3 && currentAnalysis.hotspots?.length) {
      hotspotLayer.classList.add("is-visible", "is-explorable");
      selectHotspot(activeHotspotIndex >= 0 ? activeHotspotIndex : 0);
    } else if (!revealComplete) {
      hotspotLayer.classList.remove("is-visible", "is-explorable");
      hotspotDetail.hidden = true;
      artifactFrame.classList.remove("is-focused");
    }

    requestAnimationFrame(() => revealCard.classList.add("is-visible"));
    revealTransitioning = false;
    window.setTimeout(() => artifactFrame.classList.remove("is-transitioning"), 760);

    if (step === revealSteps.length - 1) {
      completeReveal();
    }
  };

  if (immediate) {
    updateContent();
  } else {
    window.setTimeout(updateContent, 180);
  }
}

function startGuidedReveal() {
  currentRevealStep = 0;
  revealComplete = false;
  activeHotspotIndex = -1;
  analysisPanel.dataset.atmosphere = "1";
  analysisIntro.hidden = true;
  guidedExhibit.hidden = false;
  guidedExhibit.classList.remove("is-exploring", "is-revealed");
  revealControls.hidden = false;
  revealCompletion.hidden = true;
  exploreButton.hidden = false;
  hotspotDetail.hidden = true;
  hotspotLayer.classList.remove("is-visible", "is-explorable");
  artifactFrame.classList.remove("is-focused", "is-generating", "is-worn");
  viewToggle.hidden = true;
  generationState.hidden = true;
  experienceObject.textContent = currentAnalysis.garment_name;
  stageFileName.textContent = selectedImage.name;
  stageCaptionLabel.textContent = "Displayed artifact";
  findingTabs.forEach((tab) => {
    tab.disabled = true;
    tab.classList.remove("is-visited");
  });
  exhibitImage.src = currentImageUrl;
  renderHotspots();
  renderRevealStep(0, true);
  uploadSection.classList.add("is-exhibit-mode");
  dropZone.classList.add("is-departing");
  window.setTimeout(() => {
    if (currentAnalysis) {
      dropZone.hidden = true;
    }
  }, 700);
}

function setReconstructionView(view) {
  const showWornView = view === "worn";

  displayedViewButton.classList.toggle("is-active", !showWornView);
  displayedViewButton.setAttribute("aria-pressed", String(!showWornView));
  wornViewButton.classList.toggle("is-active", showWornView);
  wornViewButton.setAttribute("aria-pressed", String(showWornView));
  displayedImage.classList.toggle("is-active", !showWornView);
  wornImage.classList.toggle("is-active", showWornView);
  artifactFrame.classList.toggle("is-worn", showWornView);
  artifactFrame.classList.toggle("is-focused", !showWornView && activeHotspotIndex >= 0);
  stageCaptionLabel.textContent = showWornView ? "Worn reconstruction" : "Displayed artifact";
}

function waitForImage(image) {
  if (image.complete && image.naturalWidth) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", () => reject(new Error("The generated image could not be displayed.")), {
      once: true,
    });
  });
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
  analysisIntro.hidden = false;
  guidedExhibit.hidden = true;
  analysisStatus.textContent = "Analyzing the visible details…";
  currentAnalysis = undefined;
  generationState.hidden = true;
  viewToggle.hidden = true;
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

    currentAnalysis = result;
    analysisStatus.textContent = "";
    reconstructButton.hidden = false;
    reconstructionStatus.textContent = "";
    reconstructionError.textContent = "";
    startGuidedReveal();
    window.setTimeout(() => {
      analysisPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 380);
  } catch (error) {
    analysisStatus.textContent = error.message;
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.textContent = "Analyze garment";
  }
});

revealNextButton.addEventListener("click", () => {
  if (!revealTransitioning && currentRevealStep < revealSteps.length - 1) {
    renderRevealStep(currentRevealStep + 1);
  }
});

revealBackButton.addEventListener("click", () => {
  if (!revealTransitioning && currentRevealStep > 0) {
    renderRevealStep(currentRevealStep - 1);
  }
});

exploreButton.addEventListener("click", () => {
  findingTabs.forEach((tab) => {
    tab.disabled = false;
  });
  guidedExhibit.classList.add("is-exploring");
  exploreButton.hidden = true;
  findingTabs[0].focus();
});

experienceReset.addEventListener("click", openFilePicker);

findingTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (!revealTransitioning) {
      renderRevealStep(Number(tab.dataset.step));
    }
  });
});

exhibitImage.addEventListener("load", positionHotspotLayer);
window.addEventListener("resize", positionHotspotLayer);

artifactFrame.addEventListener("pointermove", (event) => {
  if (
    artifactFrame.classList.contains("is-focused") ||
    artifactFrame.classList.contains("is-worn") ||
    artifactFrame.classList.contains("is-generating")
  ) {
    return;
  }

  const bounds = artifactFrame.getBoundingClientRect();
  const horizontalPosition = (event.clientX - bounds.left) / bounds.width - 0.5;
  const verticalPosition = (event.clientY - bounds.top) / bounds.height - 0.5;
  artifactMedia.style.setProperty("--pan-x", `${horizontalPosition * -8}px`);
  artifactMedia.style.setProperty("--pan-y", `${verticalPosition * -6}px`);
});

artifactFrame.addEventListener("pointerleave", () => {
  if (!artifactFrame.classList.contains("is-focused")) {
    artifactMedia.style.setProperty("--pan-x", "0px");
    artifactMedia.style.setProperty("--pan-y", "0px");
  }
});

reconstructButton.addEventListener("click", async () => {
  if (!selectedImage || !currentAnalysis) {
    return;
  }

  const formData = new FormData();
  formData.append("image", selectedImage);
  formData.append("analysis", JSON.stringify(currentAnalysis));

  reconstructionError.textContent = "";
  reconstructionStatus.textContent = "Studying silhouette, construction, and historical context…";
  generationState.hidden = false;
  artifactFrame.classList.add("is-generating");
  artifactFrame.classList.remove("is-focused");
  reconstructButton.disabled = true;
  reconstructButton.textContent = "Reconstructing…";

  try {
    const response = await fetch("/api/reconstruct", {
      method: "POST",
      body: formData,
    });
    const responseType = response.headers.get("content-type") || "";

    if (!responseType.includes("application/json")) {
      throw new Error("The server returned HTML instead of JSON. Restart the server and try again.");
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The worn reconstruction could not be generated.");
    }

    wornImage.classList.remove("is-active");
    wornImage.src = result.image;
    await waitForImage(wornImage);
    reconstructionStatus.textContent = "";
    reconstructButton.hidden = true;
    artifactFrame.classList.remove("is-generating");
    generationState.hidden = true;
    viewToggle.hidden = false;
    guidedExhibit.classList.add("has-reconstruction");
    requestAnimationFrame(() => setReconstructionView("worn"));
  } catch (error) {
    reconstructionStatus.textContent = "";
    reconstructionError.textContent = error.message;
    generationState.hidden = true;
    artifactFrame.classList.remove("is-generating");
  } finally {
    reconstructButton.disabled = false;
    reconstructButton.textContent = "See it worn in context";
  }
});

displayedViewButton.addEventListener("click", () => {
  setReconstructionView("displayed");
});

wornViewButton.addEventListener("click", () => {
  setReconstructionView("worn");
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
