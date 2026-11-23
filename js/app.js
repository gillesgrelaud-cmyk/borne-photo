const PHOTOS_PER_SESSION = 3;
const COUNTDOWN_SECONDS = 3;
const CAPTURE_INTERVAL_MS = 1200;

const FILTERS = [
  { id: "none", label: "Aucun", css: "none", mirror: true },
  { id: "nb", label: "Noir & blanc", css: "grayscale(1) contrast(1.1)", mirror: true },
  { id: "sepia", label: "Sépia", css: "sepia(0.8) contrast(1.05)", mirror: true },
  { id: "vintage", label: "Vintage", css: "sepia(0.35) saturate(1.4) hue-rotate(-10deg)", mirror: true },
  { id: "froid", label: "Froid", css: "hue-rotate(160deg) saturate(1.2)", mirror: false },
  { id: "pop", label: "Pop", css: "saturate(1.8) contrast(1.15)", mirror: true },
];

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const countdown = document.getElementById("countdown");
const cameraStatus = document.getElementById("cameraStatus");
const filtersBar = document.getElementById("filters");
const startBtn = document.getElementById("start");
const retakeBtn = document.getElementById("retake");
const downloadBtn = document.getElementById("download");
const resetBtn = document.getElementById("reset");
const strip = document.getElementById("strip");

let stream = null;
let currentFilter = FILTERS[0];
let photos = [];
let sessionRunning = false;

function initFilters() {
  FILTERS.forEach((filter) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "filter-chip selected";
    chip.textContent = filter.label;
    chip.dataset.filterId = filter.id;
    chip.addEventListener("click", () => selectFilter(filter, chip));
    filtersBar.appendChild(chip);
  });
}

function selectFilter(filter, chip) {
  currentFilter = filter;
  document.querySelectorAll(".filter-chip").forEach((el) => el.classList.remove("selected"));
  chip.classList.add("selected");
  video.style.filter = filter.css;
  video.classList.toggle("mirror-off", !filter.mirror);
}

function setStatus(message, isError = false) {
  cameraStatus.classList.toggle("error", isError);
  cameraStatus.style.display = "flex";
  cameraStatus.textContent = message;
}

function hideStatus() {
  cameraStatus.style.display = "none";
}

async function startCamera() {
  if (stream) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("API caméra indisponible. Utilisez un navigateur récent en HTTPS ou localhost.");
  }
  stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" },
    audio: false,
  });
  video.srcObject = stream;
  await new Promise((resolve) => video.onloadedmetadata.then(resolve));
  await video.play();
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCountdown() {
  for (let n = COUNTDOWN_SECONDS; n > 0; n -= 1) {
    countdown.textContent = n;
    countdown.classList.add("active");
    await sleep(1000);
    countdown.classList.remove("active");
    await sleep(150);
  }
}

function capturePhoto() {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) {
    throw new Error("Flux vidéo indisponible.");
  }
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const mirror = currentFilter.mirror;
  ctx.save();
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.filter = currentFilter.css;
  ctx.drawImage(video, 0, 0, w, h);
  ctx.restore();
  return canvas.toDataURL("image/jpeg", 0.92);
}

function renderStrip() {
  strip.innerHTML = "";
  for (let i = 0; i < PHOTOS_PER_SESSION; i += 1) {
    const photo = photos[i];
    if (photo) {
      const img = document.createElement("img");
      img.src = photo.dataUrl;
      img.alt = photo.alt;
      strip.appendChild(img);
    } else {
      const slot = document.createElement("div");
      slot.className = "slot";
      slot.textContent = `Photo ${i + 1}`;
      strip.appendChild(slot);
    }
  }
  downloadBtn.classList.toggle("visible", photos.length === PHOTOS_PER_SESSION);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image invalide."));
    img.src = src;
  });
}

async function composeStrip() {
  const photoWidth = 640;
  const photoHeight = 480;
  const gap = 24;
  const padding = 40;
  const width = photoWidth + padding * 2;
  const height = PHOTOS_PER_SESSION * photoHeight + (PHOTOS_PER_SESSION - 1) * gap + padding * 2;

  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#1a1d2e";
  ctx.font = "600 34px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Borne Photo", width / 2, padding + 10);

  for (let index = 0; index < photos.length; index += 1) {
    const img = await loadImage(photos[index].dataUrl);
    const y = padding + 50 + index * (photoHeight + gap);
    ctx.drawImage(img, padding, y, photoWidth, photoHeight);
  }

  return out.toDataURL("image/jpeg", 0.92);
}

function setControls(running, done) {
  startBtn.disabled = running;
  retakeBtn.disabled = running;
  resetBtn.disabled = running || photos.length === 0;
  startBtn.textContent = photos.length > 0 && !done ? "Continuer la séance" : "Lancer la séance";
}

async function runSession() {
  if (sessionRunning) return;
  sessionRunning = true;
  setControls(true, false);
  try {
    setStatus("Activation de la caméra…");
    await startCamera();
    hideStatus();
    const remaining = PHOTOS_PER_SESSION - photos.length;
    for (let i = 0; i < remaining; i += 1) {
      await runCountdown();
      photos.push({ dataUrl: capturePhoto(), alt: `Photo ${photos.length + 1}` });
      renderStrip();
      if (i < remaining - 1) {
        await sleep(CAPTURE_INTERVAL_MS);
      }
    }
    setStatus("Séance terminée — téléchargez votre bande.");
  } catch (error) {
    const message = error && error.name === "NotAllowedError"
      ? "Accès à la caméra refusé. Autorisez la caméra puis relancez."
      : (error.message || "Erreur inattendue.");
    setStatus(message, true);
    stopCamera();
  } finally {
    sessionRunning = false;
    setControls(false, photos.length === PHOTOS_PER_SESSION);
  }
}

async function retake() {
  photos = [];
  renderStrip();
  await runSession();
}

function reset() {
  stopCamera();
  photos = [];
  renderStrip();
  setStatus("Caméra inactive — cliquez sur « Lancer la séance ».");
  setControls(false, false);
}

async function download() {
  const link = document.createElement("a");
  link.href = await composeStrip();
  link.download = "borne-photo.jpeg";
  link.click();
}

startBtn.addEventListener("click", runSession);
retakeBtn.addEventListener("click", retake);
resetBtn.addEventListener("click", reset);
downloadBtn.addEventListener("click", download);

initFilters();
renderStrip();
