const imageInput = document.querySelector("#garment-upload");
const dropZone = document.querySelector("#drop-zone");
const emptyState = document.querySelector("#empty-state");
const previewState = document.querySelector("#preview-state");
const imagePreview = document.querySelector("#image-preview");
const fileName = document.querySelector("#file-name");
const chooseAgainButton = document.querySelector("#choose-again");

let currentImageUrl;
let dragDepth = 0;

function showImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  if (currentImageUrl) {
    URL.revokeObjectURL(currentImageUrl);
  }

  currentImageUrl = URL.createObjectURL(file);
  imagePreview.classList.remove("is-loaded");
  imagePreview.src = currentImageUrl;
  fileName.textContent = file.name;

  emptyState.setAttribute("aria-hidden", "true");
  previewState.setAttribute("aria-hidden", "false");
  dropZone.classList.add("has-image");
}

function openFilePicker() {
  imageInput.click();
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
