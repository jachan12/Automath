// utils.js — fælles drag & drop helpers

// Start af drag
function dragStartHandler(e) {
  // Gem den værdi vi vil droppe
  e.dataTransfer.setData("text/plain", e.target.dataset.value || "");
  e.dataTransfer.effectAllowed = "move";
  e.target.classList.add("dragging");
}

// Slut af drag (ryd styling)
function dragEndHandler(e) {
  e.target.classList.remove("dragging");
}

// Tillad drop (skal kaldes på drop-zoner)
function allowDropHandler(e) {
  e.preventDefault(); // uden denne kan man ikke droppe
  e.dataTransfer.dropEffect = "move";
}

// Selve droppet
function dropHandler(e) {
  e.preventDefault();

  // Brug currentTarget = elementet vi satte event-listener på (altså boksen)
  const dropZone = e.currentTarget;

  // Tjek om det er en gyldig dropzone
  const isValidDropZone =
    dropZone.classList.contains("drop-box") ||
    dropZone.classList.contains("dropzone");

  if (!isValidDropZone) return;

  const value = e.dataTransfer.getData("text/plain");
  if (!value) return;

  // Sæt værdien i boksen
  dropZone.textContent = value;
  dropZone.dataset.value = value;
  dropZone.classList.add("filled");
}

// Gør funktionerne globale (så Shop/GameScene kan bruge dem)
window.dragStartHandler = dragStartHandler;
window.dragEndHandler = dragEndHandler;
window.allowDropHandler = allowDropHandler;
window.dropHandler = dropHandler;
