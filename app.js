const beginButton = document.querySelector("#begin-button");
const imageInput = document.querySelector("#garment-upload");
const dropZone = document.querySelector("#drop-zone");
const emptyState = document.querySelector("#empty-state");
const previewState = document.querySelector("#preview-state");
const imagePreview = document.querySelector("#image-preview");
const fileName = document.querySelector("#file-name");
const uploadError = document.querySelector("#upload-error");
const chooseAgainButton = document.querySelector("#choose-again");
const analyzeButton = document.querySelector("#analyze-button");
const uploadSection = document.querySelector("#upload");
const analysisPanel = document.querySelector("#analysis-panel");
const analysisIntro = document.querySelector("#analysis-intro");
const analysisStatus = document.querySelector("#analysis-status");
const analysisStageItems = [...document.querySelectorAll("#analysis-stages li")];
const guidedExhibit = document.querySelector("#guided-exhibit");
const artifactFrame = document.querySelector("#artifact-frame");
const artifactMedia = document.querySelector("#artifact-media");
const narrativeStage = document.querySelector(".narrative-stage");
const hotspotLayer = document.querySelector("#hotspot-layer");
const hotspotDetail = document.querySelector("#hotspot-detail");
const hotspotTitle = document.querySelector("#hotspot-title");
const hotspotDescription = document.querySelector("#hotspot-description");
const revealCard = document.querySelector("#reveal-card");
const revealNumber = document.querySelector("#reveal-number");
const revealTitle = document.querySelector("#reveal-title");
const revealCopy = document.querySelector("#reveal-copy");
const fullFindingButton = document.querySelector("#full-finding-button");
const fullFindingDialog = document.querySelector("#full-finding-dialog");
const fullFindingClose = document.querySelector("#full-finding-close");
const fullFindingContent = document.querySelector("#full-finding-content");
const revealBackButton = document.querySelector("#reveal-back");
const revealNextButton = document.querySelector("#reveal-next");
const revealControls = document.querySelector("#reveal-controls");
const revealCompletion = document.querySelector("#reveal-completion");
const exploreButton = document.querySelector("#explore-button");
const storyExploreButton = document.querySelector("#story-explore-button");
const finalStory = document.querySelector("#final-story");
const finalStoryTitle = document.querySelector("#final-story-title");
const storyIdentity = document.querySelector("#story-identity");
const storyOrigin = document.querySelector("#story-origin");
const storyEvidence = document.querySelector("#story-evidence");
const storyWearer = document.querySelector("#story-wearer");
const storyUncertainty = document.querySelector("#story-uncertainty");
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
const wornImage = document.querySelector("#worn-image");
const stageCaptionLabel = document.querySelector("#stage-caption-label");
const stageCaptionContext = document.querySelector("#stage-caption-context");
const cinematicExitButton = document.querySelector("#cinematic-exit");

const acceptedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maximumFileSize = 10 * 1024 * 1024;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let currentImageUrl;
let selectedImage;
let currentAnalysis;
let dragDepth = 0;
let currentRevealStep = 0;
let constructionMoment = 0;
let revealComplete = false;
let activeHotspotIndex = -1;
let revealTransitioning = false;
let cinematicMode = false;
let analysisStageTimer;

const revealSteps = [
  { number: "01", title: "Identity" },
  { number: "02", title: "Origin" },
  { number: "03", title: "Wearer" },
  { number: "04", title: "Construction" },
  { number: "05", title: "Historical Context" },
];

const annotationPlacements = ["left", "upper-right", "lower-left", "right", "lower-right", "upper-left", "bottom"];

function scrollToElement(element, block = "start") {
  element.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block });
}

function openFilePicker() {
  imageInput.value = "";
  imageInput.click();
}

function setUploadError(message = "") {
  uploadError.textContent = message;
  dropZone.classList.toggle("has-error", Boolean(message));
}

function stopAnalysisStages() {
  window.clearInterval(analysisStageTimer);
  analysisStageTimer = undefined;
}

function startAnalysisStages() {
  stopAnalysisStages();
  let activeStage = 0;

  const updateStages = () => {
    analysisStageItems.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeStage);
      item.classList.toggle("is-complete", index < activeStage);
    });
    analysisStatus.textContent = analysisStageItems[activeStage].textContent;
  };

  updateStages();
  analysisStageTimer = window.setInterval(() => {
    activeStage = Math.min(activeStage + 1, analysisStageItems.length - 1);
    updateStages();
  }, 1400);
}

function resetExperienceState() {
  stopAnalysisStages();
  currentAnalysis = undefined;
  currentRevealStep = 0;
  constructionMoment = 0;
  revealComplete = false;
  activeHotspotIndex = -1;
  revealTransitioning = false;
  cinematicMode = false;
  analysisPanel.hidden = true;
  analysisIntro.hidden = false;
  analysisIntro.classList.remove("has-error");
  guidedExhibit.hidden = true;
  guidedExhibit.className = "artifact-experience";
  hotspotLayer.replaceChildren();
  hotspotLayer.className = "hotspot-layer";
  hotspotDetail.hidden = true;
  revealCard.hidden = false;
  revealCompletion.hidden = true;
  finalStory.hidden = true;
  revealControls.hidden = false;
  exploreButton.hidden = false;
  reconstructionStatus.textContent = "";
  reconstructionError.textContent = "";
  generationState.hidden = true;
  viewToggle.hidden = true;
  reconstructButton.hidden = false;
  reconstructButton.disabled = false;
  reconstructButton.innerHTML = 'Return it to the body <span aria-hidden="true">→</span>';
  cinematicExitButton.disabled = false;
  artifactFrame.className = "artifact-stage";
  document.body.classList.remove("is-cinematic-mode");
  artifactMedia.removeAttribute("style");
  artifactFrame.removeAttribute("style");
  displayedImage.removeAttribute("src");
  wornImage.removeAttribute("src");
  if (fullFindingDialog.open) {
    fullFindingDialog.close();
  }
}

function showImage(file) {
  setUploadError();

  if (!file) {
    return;
  }

  if (!acceptedImageTypes.has(file.type)) {
    setUploadError("Choose a JPG, PNG, or WEBP image.");
    return;
  }

  if (file.size > maximumFileSize) {
    setUploadError("Choose an image smaller than 10 MB.");
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
  resetExperienceState();

  if (returningFromExhibit) {
    window.setTimeout(() => scrollToElement(dropZone, "center"), 80);
  }
}

function createCertainty(level) {
  const certainty = document.createElement("span");
  certainty.className = `certainty certainty-${level}`;
  certainty.textContent = level === "evidence"
    ? "Visible evidence"
    : level === "inference"
      ? "Historically supported inference"
      : "Uncertain interpretation";
  return certainty;
}

function createFact(label, value, certaintyLevel, emphasis = false) {
  const fact = document.createElement("div");
  const factHeader = document.createElement("div");
  const factLabel = document.createElement("p");
  const factValue = document.createElement("p");

  fact.className = emphasis ? "reveal-fact is-emphasized" : "reveal-fact";
  factHeader.className = "reveal-fact-header";
  factLabel.className = "reveal-fact-label";
  factValue.className = "reveal-fact-value";
  factLabel.textContent = label;
  factValue.textContent = value;
  factHeader.append(factLabel, createCertainty(certaintyLevel));
  fact.append(factHeader, factValue);
  return fact;
}

function createListFact(label, values, certaintyLevel) {
  const fact = document.createElement("div");
  const factHeader = document.createElement("div");
  const factLabel = document.createElement("p");
  const list = document.createElement("ul");

  fact.className = "reveal-fact";
  factHeader.className = "reveal-fact-header";
  factLabel.className = "reveal-fact-label";
  factLabel.textContent = label;
  factHeader.append(factLabel, createCertainty(certaintyLevel));

  for (const value of values) {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  }

  fact.append(factHeader, list);
  return fact;
}

function limitWords(value, maximum = 32) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  return words.length <= maximum ? words.join(" ") : `${words.slice(0, maximum).join(" ")}…`;
}

function buildExplanation(value) {
  const fallback = "This remains a careful interpretation rather than a verified conclusion from the photograph alone.";
  let explanation = String(value || "").trim();

  while (explanation.split(/\s+/).filter(Boolean).length < 18) {
    explanation = `${explanation} ${fallback}`.trim();
  }

  return limitWords(explanation, 32);
}

function createCompactFinding(visibleText, suggestionText, certaintyLevel = "inference") {
  const finding = document.createElement("div");
  const observation = document.createElement("div");
  const observationHeader = document.createElement("div");
  const observationLabel = document.createElement("p");
  const observationValue = document.createElement("p");
  const interpretation = document.createElement("div");
  const interpretationHeader = document.createElement("div");
  const interpretationLabel = document.createElement("p");
  const interpretationValue = document.createElement("p");

  finding.className = "compact-finding";
  observation.className = "finding-part finding-observation";
  observationHeader.className = "finding-part-header";
  observationLabel.className = "finding-part-label";
  observationLabel.textContent = "What we can see";
  observationValue.className = "finding-observation-value";
  observationValue.textContent = limitWords(visibleText, 8);
  observationHeader.append(observationLabel, createCertainty("evidence"));
  observation.append(observationHeader, observationValue);

  interpretation.className = "finding-part finding-interpretation";
  interpretationHeader.className = "finding-part-header";
  interpretationLabel.className = "finding-part-label";
  interpretationLabel.textContent = "What it suggests";
  interpretationValue.className = "finding-explanation";
  interpretationValue.textContent = buildExplanation(suggestionText);
  interpretationHeader.append(interpretationLabel, createCertainty(certaintyLevel));
  interpretation.append(interpretationHeader, interpretationValue);
  finding.append(observation, interpretation);
  return finding;
}

function getCompactFinding(step) {
  const hotspots = Array.isArray(currentAnalysis.hotspots) ? currentAnalysis.hotspots : [];

  if (step === 0) {
    return {
      visible: currentAnalysis.notable_features[0] || "The garment's overall silhouette",
      suggestion: `${currentAnalysis.garment_name} is a provisional identification based on the visible silhouette, closures, trim, and surface treatment in this photograph.`,
      certainty: "inference",
    };
  }

  if (step === 1) {
    return {
      visible: `${currentAnalysis.estimated_era} · ${currentAnalysis.region}`,
      suggestion: `The visible style may align with ${currentAnalysis.estimated_era} and ${currentAnalysis.region}, but the photograph alone cannot securely establish either date or origin.`,
      certainty: "uncertain",
    };
  }

  if (step === 2) {
    return {
      visible: currentAnalysis.notable_features[1] || currentAnalysis.garment_name,
      suggestion: `${currentAnalysis.likely_wearer} This remains a historically supported possibility, not a verified identity or exact account of use.`,
      certainty: "uncertain",
    };
  }

  if (step === 3 && constructionMoment === 0) {
    return {
      visible: currentAnalysis.notable_features.slice(0, 2).join(" · ") || "Silhouette and construction",
      suggestion: "The silhouette, closures, and surface details show how the garment was shaped, fastened, and presented on the body.",
      certainty: "inference",
    };
  }

  if (step === 3 && constructionMoment <= hotspots.length) {
    const hotspot = hotspots[constructionMoment - 1];
    return {
      visible: hotspot.label,
      suggestion: hotspot.description,
      certainty: "inference",
    };
  }

  if (step === 3) {
    return {
      visible: currentAnalysis.notable_features.slice(0, 3).join(" · "),
      suggestion: `Taken together, these details suggest ${currentAnalysis.materials.slice(0, 2).join(" and ")}, while exact fibers and techniques still require physical examination.`,
      certainty: "inference",
    };
  }

  return {
    visible: currentAnalysis.notable_features[0] || currentAnalysis.garment_name,
    suggestion: `${currentAnalysis.short_historical_context} ${currentAnalysis.confidence_note}`,
    certainty: "uncertain",
  };
}

function buildStepContent(step) {
  const fragment = document.createDocumentFragment();
  const finding = getCompactFinding(step);
  fragment.append(createCompactFinding(finding.visible, finding.suggestion, finding.certainty));
  return fragment;
}

function buildFullAnalysisContent() {
  const fragment = document.createDocumentFragment();
  fragment.append(
    createFact("Provisional identification", currentAnalysis.garment_name, "inference", true),
    createFact("Estimated period", currentAnalysis.estimated_era, "uncertain"),
    createFact("Possible region", currentAnalysis.region, "uncertain"),
    createFact("Possible wearer or use", currentAnalysis.likely_wearer, "uncertain"),
    createListFact("Likely materials", currentAnalysis.materials, "inference"),
    createListFact("Visible features", currentAnalysis.notable_features, "evidence"),
    createFact("Historical context", currentAnalysis.short_historical_context, "inference"),
    createFact("What remains unresolved", currentAnalysis.confidence_note, "uncertain"),
  );

  (currentAnalysis.hotspots || []).forEach((hotspot, index) => {
    fragment.append(createFact(`Visible detail ${String(index + 1).padStart(2, "0")} · ${hotspot.label}`, hotspot.description, "evidence"));
  });

  return fragment;
}

function getConstructionTitle() {
  const hotspots = Array.isArray(currentAnalysis.hotspots) ? currentAnalysis.hotspots : [];

  if (constructionMoment === 0) {
    return "How it is made";
  }

  if (constructionMoment === hotspots.length + 1) {
    return "Evidence in combination";
  }

  return hotspots[constructionMoment - 1]?.label || "Visible construction";
}

function getHotspotAction(label = "") {
  const normalizedLabel = label.toLowerCase();

  if (/collar|neck|hood|lapel/.test(normalizedLabel)) return "Examine the neckline";
  if (/embroider|braid|trim|ornament|pattern/.test(normalizedLabel)) return "Follow the ornament";
  if (/sleeve|cuff/.test(normalizedLabel)) return "Inspect the sleeve";
  if (/hem|silhouette|drape|pleat/.test(normalizedLabel)) return "Study the silhouette";
  if (/button|closure|fasten|placket/.test(normalizedLabel)) return "Trace the fastening";
  if (/pocket/.test(normalizedLabel)) return "Inspect the pocket";
  return `Examine ${limitWords(label || "the next detail", 3).toLowerCase()}`;
}

function getNextAction(step) {
  if (step === 0) return "Place it in time";
  if (step === 1) return "Consider the wearer";
  if (step === 2) return "Study the silhouette";

  if (step === 3) {
    const hotspots = Array.isArray(currentAnalysis.hotspots) ? currentAnalysis.hotspots : [];
    if (constructionMoment < hotspots.length) {
      return getHotspotAction(hotspots[constructionMoment].label);
    }
    if (constructionMoment === hotspots.length) return "Connect the evidence";
    return "Place it in context";
  }

  return "Complete the investigation";
}

function setNextButtonLabel(label) {
  const arrow = document.createElement("span");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "→";
  revealNextButton.replaceChildren(document.createTextNode(`${label} `), arrow);
}

function getAnnotationSequenceIndex(step) {
  if (step < 3) {
    return step;
  }

  if (step === 3) {
    return 3 + constructionMoment;
  }

  return 4 + (currentAnalysis.hotspots?.length || 0) + 1;
}

function setAnnotationPlacement(step) {
  const sequenceIndex = getAnnotationSequenceIndex(step);
  const placement = annotationPlacements[sequenceIndex % annotationPlacements.length];
  narrativeStage.dataset.placement = placement;
  narrativeStage.dataset.sequence = String(sequenceIndex);
  artifactFrame.dataset.annotationPlacement = placement;
  return placement;
}

function setGarmentReframe(hotspot, placement) {
  if (!hotspot) {
    artifactMedia.style.setProperty("--camera-x", "0%");
    artifactMedia.style.setProperty("--camera-y", "0%");
    artifactMedia.style.setProperty("--camera-scale", "1");
    return;
  }

  const awayVectors = {
    left: [3, 0],
    "upper-right": [-2.5, 2],
    "lower-left": [2.5, -2],
    right: [-3, 0],
    "lower-right": [-2.5, -2],
    "upper-left": [2.5, 2],
    bottom: [0, -3],
  };
  const [awayX, awayY] = awayVectors[placement] || [0, 0];
  const centerX = (50 - Number(hotspot.x)) * 0.035;
  const centerY = (50 - Number(hotspot.y)) * 0.035;
  const cameraX = Math.max(-4, Math.min(4, awayX + centerX));
  const cameraY = Math.max(-4, Math.min(4, awayY + centerY));
  const cameraScale = 1.02 + ((constructionMoment - 1) % 4) * 0.01;

  artifactMedia.style.setProperty("--camera-x", `${cameraX.toFixed(2)}%`);
  artifactMedia.style.setProperty("--camera-y", `${cameraY.toFixed(2)}%`);
  artifactMedia.style.setProperty("--camera-scale", String(Math.min(1.05, cameraScale)));
}

function positionHotspotLayer() {
  if (!displayedImage.naturalWidth || !displayedImage.naturalHeight || cinematicMode) {
    return;
  }

  const frame = artifactMedia.getBoundingClientRect();
  const imageRatio = displayedImage.naturalWidth / displayedImage.naturalHeight;
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
    artifactFrame.classList.remove("has-active-evidence", "is-focused");
    return;
  }

  activeHotspotIndex = index;
  hotspotTitle.textContent = hotspot.label;
  hotspotDescription.textContent = hotspot.description;
  hotspotDetail.hidden = true;
  artifactMedia.style.setProperty("--focus-x", `${hotspot.x}%`);
  artifactMedia.style.setProperty("--focus-y", `${hotspot.y}%`);
  artifactFrame.classList.add("has-active-evidence", "is-focused");

  [...hotspotLayer.children].forEach((marker, markerIndex) => {
    const selected = markerIndex === index;
    marker.classList.toggle("is-active", selected);
    marker.setAttribute("aria-pressed", String(selected));
  });
}

function clearHotspotSelection() {
  activeHotspotIndex = -1;
  hotspotDetail.hidden = true;
  artifactFrame.classList.remove("has-active-evidence", "is-focused");
  artifactMedia.style.setProperty("--pan-x", "0px");
  artifactMedia.style.setProperty("--pan-y", "0px");

  [...hotspotLayer.children].forEach((marker) => {
    marker.classList.remove("is-active");
    marker.setAttribute("aria-pressed", "false");
  });
}

function renderHotspots() {
  hotspotLayer.replaceChildren();
  const hotspots = Array.isArray(currentAnalysis.hotspots) ? currentAnalysis.hotspots : [];

  hotspots.forEach((hotspot, index) => {
    const marker = document.createElement("button");
    const markerNumber = document.createElement("i");
    const markerLabel = document.createElement("span");
    const x = Math.min(100, Math.max(0, Number(hotspot.x)));
    const y = Math.min(100, Math.max(0, Number(hotspot.y)));

    marker.type = "button";
    marker.className = "hotspot-marker";
    marker.classList.toggle("is-label-left", x > 64);
    marker.style.left = `${x}%`;
    marker.style.top = `${y}%`;
    marker.setAttribute("aria-label", `Evidence ${index + 1}: ${hotspot.label}`);
    marker.setAttribute("aria-pressed", "false");
    markerNumber.textContent = String(index + 1).padStart(2, "0");
    markerLabel.textContent = limitWords(hotspot.label, 3);
    marker.append(markerNumber, markerLabel);
    marker.addEventListener("click", () => {
      if (revealComplete || currentRevealStep === 3) {
        constructionMoment = index + 1;
        revealCompletion.hidden = true;
        finalStory.hidden = true;
        renderRevealStep(3);
      }
    });
    hotspotLayer.append(marker);
  });

  hotspotLayer.classList.toggle("is-present", hotspots.length > 0);
  positionHotspotLayer();
}

function completeReveal() {
  if (revealComplete) {
    return;
  }

  revealComplete = true;
  revealControls.hidden = true;
  revealCard.hidden = true;
  revealCompletion.hidden = false;
  hotspotLayer.classList.add("is-visible", "is-explorable");
  guidedExhibit.classList.add("is-revealed");
  stageCaptionContext.textContent = "Select a numbered detail to inspect the evidence";
  clearHotspotSelection();
}

function renderRevealStep(step, immediate = false) {
  currentRevealStep = step;
  revealTransitioning = !immediate;
  revealCard.hidden = false;
  finalStory.hidden = true;
  revealCard.classList.remove("is-visible");
  artifactFrame.classList.remove("is-transitioning");
  progressLabel.textContent = `Discovery ${String(step + 1).padStart(2, "0")} of 05`;
  progressFill.style.width = `${((step + 1) / revealSteps.length) * 100}%`;
  requestAnimationFrame(() => artifactFrame.classList.add("is-transitioning"));

  const updateContent = () => {
    const revealStep = revealSteps[step];
    const constructionHotspots = Array.isArray(currentAnalysis.hotspots) ? currentAnalysis.hotspots : [];
    const constructionFinalMoment = constructionHotspots.length + 1;
    const activeConstructionHotspot = step === 3 && constructionMoment > 0 && constructionMoment <= constructionHotspots.length
      ? constructionHotspots[constructionMoment - 1]
      : undefined;

    revealNumber.textContent = step === 3
      ? `04 · ${String(constructionMoment + 1).padStart(2, "0")} / ${String(constructionFinalMoment + 1).padStart(2, "0")}`
      : revealStep.number;
    revealTitle.textContent = step === 3 ? getConstructionTitle() : revealStep.title;
    revealCopy.replaceChildren(buildStepContent(step));
    const annotationPlacement = setAnnotationPlacement(step);
    setGarmentReframe(activeConstructionHotspot, annotationPlacement);

    findingTabs.forEach((tab, index) => {
      tab.classList.toggle("is-active", index === step);
      tab.classList.toggle("is-visited", index <= step || revealComplete);
    });

    if (!revealComplete) {
      revealBackButton.hidden = step === 0 && constructionMoment === 0;

      setNextButtonLabel(getNextAction(step));
    }

    if (step === 3) {
      hotspotLayer.classList.add("is-visible", "is-explorable");

      if (activeConstructionHotspot) {
        selectHotspot(constructionMoment - 1);
      } else {
        clearHotspotSelection();
      }

      stageCaptionContext.textContent = "Select a numbered detail to inspect the evidence";
    } else {
      clearHotspotSelection();

      if (!revealComplete) {
        hotspotLayer.classList.remove("is-visible", "is-explorable");
      }

      stageCaptionContext.textContent = selectedImage.name;
    }

    requestAnimationFrame(() => revealCard.classList.add("is-visible"));
    revealTransitioning = false;
    window.setTimeout(() => artifactFrame.classList.remove("is-transitioning"), 700);
    window.setTimeout(positionHotspotLayer, reducedMotion.matches ? 0 : 850);

  };

  if (immediate || reducedMotion.matches) {
    updateContent();
  } else {
    window.setTimeout(updateContent, 180);
  }
}

function startGuidedReveal() {
  stopAnalysisStages();
  currentRevealStep = 0;
  constructionMoment = 0;
  revealComplete = false;
  activeHotspotIndex = -1;
  analysisIntro.hidden = true;
  guidedExhibit.hidden = false;
  guidedExhibit.className = "artifact-experience";
  revealControls.hidden = false;
  revealCompletion.hidden = true;
  finalStory.hidden = true;
  revealCard.hidden = false;
  exploreButton.hidden = false;
  hotspotDetail.hidden = true;
  hotspotLayer.className = "hotspot-layer";
  artifactFrame.className = "artifact-stage";
  viewToggle.hidden = true;
  generationState.hidden = true;
  experienceObject.textContent = currentAnalysis.garment_name;
  stageCaptionContext.textContent = selectedImage.name;
  stageCaptionLabel.textContent = "Artifact / source image";
  findingTabs.forEach((tab) => {
    tab.disabled = true;
    tab.classList.remove("is-visited");
  });
  displayedImage.src = currentImageUrl;
  renderHotspots();
  renderRevealStep(0, true);
  uploadSection.classList.add("is-exhibit-mode");
  dropZone.classList.add("is-departing");
  window.setTimeout(() => {
    if (currentAnalysis) {
      dropZone.hidden = true;
    }
  }, reducedMotion.matches ? 0 : 560);
}

function enableExploration(focusFirst = true) {
  findingTabs.forEach((tab) => {
    tab.disabled = false;
  });
  guidedExhibit.classList.add("is-exploring");
  revealCompletion.hidden = true;
  finalStory.hidden = true;
  revealCard.hidden = false;
  exploreButton.hidden = true;
  renderRevealStep(currentRevealStep, true);

  if (focusFirst) {
    findingTabs[currentRevealStep].focus();
  }
}

function populateFinalStory() {
  storyIdentity.textContent = currentAnalysis.garment_name;
  storyOrigin.textContent = `${currentAnalysis.estimated_era} · ${currentAnalysis.region}`;
  storyEvidence.textContent = currentAnalysis.notable_features.slice(0, 3).join(" · ");
  storyWearer.textContent = currentAnalysis.likely_wearer;
  storyUncertainty.textContent = currentAnalysis.confidence_note;
}

function showFinalStory() {
  if (!guidedExhibit.classList.contains("has-reconstruction")) {
    return;
  }

  populateFinalStory();
  findingTabs.forEach((tab) => {
    tab.disabled = false;
    tab.classList.add("is-visited");
    tab.classList.remove("is-active");
  });
  revealCard.hidden = true;
  hotspotDetail.hidden = true;
  revealControls.hidden = true;
  revealCompletion.hidden = true;
  finalStory.hidden = false;
  finalStoryTitle.setAttribute("tabindex", "-1");
  finalStoryTitle.focus({ preventScroll: true });
}

function setReconstructionView(view) {
  const showReconstruction = view === "worn";

  displayedViewButton.classList.toggle("is-active", !showReconstruction);
  displayedViewButton.setAttribute("aria-pressed", String(!showReconstruction));
  wornViewButton.classList.toggle("is-active", showReconstruction);
  wornViewButton.setAttribute("aria-pressed", String(showReconstruction));
  displayedImage.classList.toggle("is-active", !showReconstruction);
  wornImage.classList.toggle("is-active", showReconstruction);
  artifactFrame.classList.toggle("is-worn", showReconstruction);
  artifactFrame.classList.toggle("is-focused", !showReconstruction && !cinematicMode && activeHotspotIndex >= 0);
  stageCaptionLabel.textContent = showReconstruction ? "Historically informed interpretation" : "Artifact / source image";
  stageCaptionContext.textContent = cinematicMode
    ? showReconstruction
      ? "Interpretation—not a verified historical record"
      : "Original uploaded evidence"
    : "Select a numbered detail to inspect the evidence";
}

function enterCinematicMode() {
  cinematicMode = true;
  document.body.classList.add("is-cinematic-mode");
  artifactFrame.classList.add("is-cinematic");
  window.setTimeout(() => cinematicExitButton.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 450);
}

function exitCinematicMode() {
  if (cinematicExitButton.disabled) {
    return;
  }

  cinematicMode = false;
  document.body.classList.remove("is-cinematic-mode");
  artifactFrame.classList.remove("is-cinematic", "is-generating");
  setReconstructionView("displayed");

  if (guidedExhibit.classList.contains("has-reconstruction")) {
    showFinalStory();
  } else {
    reconstructButton.focus({ preventScroll: true });
  }
}

function waitForImage(image) {
  if (image.complete && image.naturalWidth) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", () => reject(new Error("The generated image could not be displayed.")), { once: true });
  });
}

beginButton.addEventListener("click", () => scrollToElement(uploadSection));

imageInput.addEventListener("change", () => showImage(imageInput.files[0]));
imagePreview.addEventListener("load", () => imagePreview.classList.add("is-loaded"));

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
  analysisIntro.classList.remove("has-error");
  guidedExhibit.hidden = true;
  currentAnalysis = undefined;
  viewToggle.hidden = true;
  analyzeButton.disabled = true;
  analyzeButton.textContent = "Investigation in progress";
  startAnalysisStages();
  scrollToElement(analysisPanel, "center");

  try {
    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const responseType = response.headers.get("content-type") || "";

    if (!responseType.includes("application/json")) {
      throw new Error("The server returned an unexpected response. Restart it and try again.");
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "The garment could not be analyzed.");
    }

    currentAnalysis = result;
    analysisStatus.textContent = "";
    reconstructButton.hidden = false;
    reconstructionError.textContent = "";
    startGuidedReveal();
    window.setTimeout(() => scrollToElement(analysisPanel), reducedMotion.matches ? 0 : 300);
  } catch (error) {
    stopAnalysisStages();
    analysisStatus.textContent = error.message;
    analysisIntro.classList.add("has-error");
  } finally {
    analyzeButton.disabled = false;
    analyzeButton.innerHTML = 'Begin analysis <span aria-hidden="true">→</span>';
  }
});

revealNextButton.addEventListener("click", () => {
  if (revealTransitioning) {
    return;
  }

  if (currentRevealStep === 3) {
    const finalConstructionMoment = (currentAnalysis.hotspots?.length || 0) + 1;

    if (constructionMoment < finalConstructionMoment) {
      constructionMoment += 1;
      renderRevealStep(3);
    } else {
      renderRevealStep(4);
    }
  } else if (currentRevealStep < revealSteps.length - 1) {
    if (currentRevealStep === 2) {
      constructionMoment = 0;
    }
    renderRevealStep(currentRevealStep + 1);
  } else {
    completeReveal();
  }
});

revealBackButton.addEventListener("click", () => {
  if (revealTransitioning) {
    return;
  }

  if (currentRevealStep === 3 && constructionMoment > 0) {
    constructionMoment -= 1;
    renderRevealStep(3);
  } else if (currentRevealStep > 0) {
    if (currentRevealStep === 4) {
      constructionMoment = (currentAnalysis.hotspots?.length || 0) + 1;
    }
    renderRevealStep(currentRevealStep - 1);
  }
});

exploreButton.addEventListener("click", () => enableExploration());
storyExploreButton.addEventListener("click", () => enableExploration());
experienceReset.addEventListener("click", openFilePicker);

fullFindingButton.addEventListener("click", () => {
  if (!currentAnalysis) {
    return;
  }

  fullFindingContent.replaceChildren(buildFullAnalysisContent());
  fullFindingDialog.showModal();
  fullFindingClose.focus();
});

fullFindingClose.addEventListener("click", () => fullFindingDialog.close());
fullFindingDialog.addEventListener("click", (event) => {
  if (event.target === fullFindingDialog) {
    fullFindingDialog.close();
  }
});

findingTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (!revealTransitioning) {
      revealCompletion.hidden = true;
      finalStory.hidden = true;
      const requestedStep = Number(tab.dataset.step);
      if (requestedStep === 3) {
        constructionMoment = 0;
      }
      renderRevealStep(requestedStep);
    }
  });
});

displayedImage.addEventListener("load", positionHotspotLayer);
window.addEventListener("resize", positionHotspotLayer);

artifactFrame.addEventListener("pointermove", (event) => {
  if (reducedMotion.matches) {
    return;
  }

  if (cinematicMode) {
    const bounds = artifactFrame.getBoundingClientRect();
    const horizontalPosition = (event.clientX - bounds.left) / bounds.width - 0.5;
    const verticalPosition = (event.clientY - bounds.top) / bounds.height - 0.5;
    artifactFrame.style.setProperty("--scene-x", `${horizontalPosition * 8}px`);
    artifactFrame.style.setProperty("--scene-y", `${verticalPosition * 5}px`);
    return;
  }

  if (artifactFrame.classList.contains("is-focused") || artifactFrame.classList.contains("is-generating")) {
    return;
  }

  const bounds = artifactFrame.getBoundingClientRect();
  const horizontalPosition = (event.clientX - bounds.left) / bounds.width - 0.5;
  const verticalPosition = (event.clientY - bounds.top) / bounds.height - 0.5;
  artifactMedia.style.setProperty("--pan-x", `${horizontalPosition * -5}px`);
  artifactMedia.style.setProperty("--pan-y", `${verticalPosition * -4}px`);
});

artifactFrame.addEventListener("pointerleave", () => {
  artifactFrame.style.setProperty("--scene-x", "0px");
  artifactFrame.style.setProperty("--scene-y", "0px");

  if (!artifactFrame.classList.contains("is-focused")) {
    artifactMedia.style.setProperty("--pan-x", "0px");
    artifactMedia.style.setProperty("--pan-y", "0px");
  }
});

reconstructButton.addEventListener("click", async () => {
  if (!selectedImage || !currentAnalysis || !revealComplete) {
    return;
  }

  const formData = new FormData();
  formData.append("image", selectedImage);
  formData.append("analysis", JSON.stringify(currentAnalysis));
  reconstructionError.textContent = "";
  reconstructionStatus.textContent = "Preserving silhouette, construction, and visible surface detail";
  generationState.hidden = false;
  viewToggle.hidden = true;
  setReconstructionView("displayed");
  enterCinematicMode();
  artifactFrame.classList.add("is-generating");
  artifactFrame.classList.remove("is-focused");
  cinematicExitButton.disabled = true;
  reconstructButton.disabled = true;
  reconstructButton.textContent = "Building interpretation";

  try {
    const response = await fetch("/api/reconstruct", { method: "POST", body: formData });
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
    artifactFrame.classList.remove("is-generating");
    generationState.hidden = true;
    viewToggle.hidden = false;
    guidedExhibit.classList.add("has-reconstruction");
    populateFinalStory();
    requestAnimationFrame(() => setReconstructionView("worn"));
  } catch (error) {
    reconstructionStatus.textContent = "";
    reconstructionError.textContent = error.message;
    generationState.hidden = true;
    artifactFrame.classList.remove("is-generating");
    cinematicExitButton.disabled = false;
    exitCinematicMode();
  } finally {
    cinematicExitButton.disabled = false;
    reconstructButton.disabled = false;
    reconstructButton.innerHTML = 'Return it to the body <span aria-hidden="true">→</span>';
  }
});

displayedViewButton.addEventListener("click", () => setReconstructionView("displayed"));
wornViewButton.addEventListener("click", () => {
  enterCinematicMode();
  setReconstructionView("worn");
});
cinematicExitButton.addEventListener("click", exitCinematicMode);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && cinematicMode && !cinematicExitButton.disabled) {
    exitCinematicMode();
  }
});

dropZone.addEventListener("dragenter", (event) => {
  event.preventDefault();
  dragDepth += 1;
  dropZone.classList.add("is-dragging");
});

dropZone.addEventListener("dragover", (event) => event.preventDefault());

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
  stopAnalysisStages();
  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
  }
});
