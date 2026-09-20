/*
  The four tracks are part of the same album, so I wanted the records
  to feel like they are continuously moving around the same player
  rather than loading a completely different page for each track.

  I also wanted to keep the interface minimal, so the description for
  each song is hidden until the user hovers over the colour indicator.

  The aura uses the audio frequency data to react to the music.
  I adjusted some values for individual tracks because their rhythms
  produced very different amounts of movement.
*/


// Track information

const tracks = [
  {
    number: "01",
    title: "Hes",
    record: "images/01 hes-record.png",
    cover: "images/01 hes-cover.png",
    mood: "Feeling of Red Judgment",
    description: "The deep red feels like a trial in hell, intense and heavy, filled with pressure and a sense that judgment is unavoidable.",
    backgroundColour: "#1e0303",
    auraColour: "#ff3c3c",
    reactivity: 1.8,
    highlightPunch: 1.9,
    audio: "https://thelongesthumstore.sgp1.cdn.digitaloceanspaces.com/IM-2250/p-hase_Hes.mp3"
  },

  {
    number: "02",
    title: "Dry Down",
    record: "images/02 drydown-record.png",
    cover: "images/02 drydown-cover.png",
    mood: "Feeling of Blue Rush",
    description: "The bright blue reflects the speed and tension of modern life, turning the pressure of everyday routines into a restless urban journey.",
    melodySensitivity: 0.6,
    backgroundColour: "#031819",
    auraColour: "#22c2e0",
    audio: "https://thelongesthumstore.sgp1.cdn.digitaloceanspaces.com/IM-2250/p-hase_Dry-Down-feat-Ben-Snaath.mp3"
  },

  {
    number: "03",
    title: "Leapt",
    record: "images/03 leapt-record.png",
    cover: "images/03 leapt-cover.png",
    mood: "Feeling of Purple Escape",
    description: "The purple feels dreamlike and unstable, like being chased through a strange dream while gradually finding the strength to escape and overcome it.",
    backgroundColour: "#17042D",
    auraColour: "#a855f7",
    audio: "https://thelongesthumstore.sgp1.cdn.digitaloceanspaces.com/IM-2250/p-hase_Leapt.mp3"
  },

  {
    number: "04",
    title: "Water Feature",
    record: "images/04 waterfeature-record.png",
    cover: "images/04 waterfeature-cover.png",
    mood: "Feeling of Mint Flow",
    description: "The mint colour feels light and fluid, moving continuously like ripples on water, with one moment gently flowing into the next.",
    highlightPunch: 0.55,
    melodySensitivity: 0.5,
    backgroundColour: "#001611",
    auraColour: "#2fe0b0",
    audio: "https://thelongesthumstore.sgp1.cdn.digitaloceanspaces.com/IM-2250/p-hase_Water-Feature.mp3"
  }
];


// Page elements

const recordsContainer = document.querySelector("#recordsContainer");
const backgroundStrip = document.querySelector("#backgroundStrip");

const trackNamesEl = document.querySelector("#trackNames");
const trackCoverImg = document.querySelector("#trackCover");

const trackStoryAccent = document.querySelector("#trackStoryAccent");
const trackStoryTitle = document.querySelector("#trackStoryTitle");
const trackStoryBody = document.querySelector("#trackStoryBody");

const audioPlayer = document.querySelector("#audioPlayer");

const playButton = document.querySelector("#playButton");
const playIcon = document.querySelector("#playIcon");

const previousButton = document.querySelector("#previousButton");
const nextButton = document.querySelector("#nextButton");

const progressFill = document.querySelector("#progressFill");
const progressContainer = document.querySelector("#progressContainer");
const timeDisplay = document.querySelector("#timeDisplay");


// Player state

let currentTrack = 0;
let visualTrack = 0;

let isPlaying = false;
let isTransitioning = false;

let hiddenSide = "left";

let isDraggingProgress = false;
let lastScrubPercentage = null;

let showElapsedTime = false;

const scrubAngles = new Array(tracks.length).fill(0);

let backgroundCentreIndex = 11;

const STEP_DURATION = 760;


function wrapIndex(index) {
  return (index + tracks.length) % tracks.length;
}


function getNextIndexFrom(index) {
  return wrapIndex(index + 1);
}


function getPreviousIndexFrom(index) {
  return wrapIndex(index - 1);
}


// Create the records and track list

function createRecords() {
  recordsContainer.innerHTML = "";

  tracks.forEach((track, index) => {
    const shell = document.createElement("div");
    shell.className = "record-shell";
    shell.dataset.index = index;

    const visual = document.createElement("div");
    visual.className = "record-visual";
    visual.dataset.index = index;

    const image = document.createElement("img");
    image.className = "record-disc";
    image.src = track.record;
    image.alt = `${track.title} vinyl record`;

    visual.appendChild(image);
    shell.appendChild(visual);
    recordsContainer.appendChild(shell);
  });

  updateScrubVisuals();
}


function updateScrubVisuals() {
  const visuals = document.querySelectorAll(".record-visual");

  visuals.forEach(visual => {
    const index = Number(visual.dataset.index);

    visual.style.setProperty(
      "--scrub-angle",
      `${scrubAngles[index]}deg`
    );
  });
}


function resetNonCurrentScrubAngles() {
  scrubAngles.forEach((_, index) => {
    if (index !== currentTrack) {
      scrubAngles[index] = 0;
    }
  });

  updateScrubVisuals();
}


function updateRecordPositions() {
  const next = getNextIndexFrom(visualTrack);
  const previous = getPreviousIndexFrom(visualTrack);
  const records = document.querySelectorAll(".record-shell");

  records.forEach(record => {
    const index = Number(record.dataset.index);

    record.classList.remove(
      "record-left",
      "record-centre",
      "record-right",
      "record-hidden-left",
      "record-hidden-right",
      "record-reset",
      "is-playing"
    );

    if (index === visualTrack) {
      record.classList.add("record-centre");

      if (isPlaying && visualTrack === currentTrack) {
        record.classList.add("is-playing");
      }
    }

    else if (index === next) {
      record.classList.add(
        "record-left",
        "record-reset"
      );
    }

    else if (index === previous) {
      record.classList.add(
        "record-right",
        "record-reset"
      );
    }

    else {
      record.classList.add(
        hiddenSide === "left"
          ? "record-hidden-left"
          : "record-hidden-right",
        "record-reset"
      );
    }
  });

  resetNonCurrentScrubAngles();
}


function createTrackList() {
  trackNamesEl.innerHTML = "";

  tracks.forEach((track, index) => {
    const button = document.createElement("button");

    button.className = "track-button";
    button.textContent = `${track.number} ${track.title}`;

    button.addEventListener("click", () => {
      selectTrack(index);
    });

    trackNamesEl.appendChild(button);
  });
}


function updateTrackList() {
  const buttons = document.querySelectorAll(".track-button");

  buttons.forEach((button, index) => {
    button.classList.toggle(
      "active",
      index === currentTrack
    );
  });

  const track = tracks[currentTrack];

  trackCoverImg.src = track.cover;
  trackCoverImg.alt = `${track.title} cover art`;

  trackStoryAccent.style.backgroundColor = track.auraColour;

  trackStoryTitle.textContent = track.mood;
  trackStoryBody.textContent = track.description;
}


// Moving background

const backgroundSequence = [
  3, 2, 1, 0,
  3, 2, 1, 0,
  3, 2, 1, 0,
  3, 2, 1, 0,
  3, 2, 1, 0,
  3, 2, 1, 0
];

const backgroundCellWidth = 60;
const mainColourHalfWidth = 24;


function createBackgroundStrip() {
  const totalCells = backgroundSequence.length;
  const totalWidth = totalCells * backgroundCellWidth;

  backgroundStrip.style.width = `${totalWidth}vw`;

  const stops = [];

  backgroundSequence.forEach((trackIndex, index) => {
    const centreVW =
      (index * backgroundCellWidth) +
      (backgroundCellWidth / 2);

    const startVW = centreVW - mainColourHalfWidth;
    const endVW = centreVW + mainColourHalfWidth;

    const startPercent = (startVW / totalWidth) * 100;
    const endPercent = (endVW / totalWidth) * 100;

    const colour = tracks[trackIndex].backgroundColour;

    stops.push(`${colour} ${startPercent}%`);
    stops.push(`${colour} ${endPercent}%`);
  });

  backgroundStrip.style.background = `
    linear-gradient(
      90deg,
      ${stops.join(",")}
    )
  `;
}


function updateBackgroundTransform(animate = true) {
  if (!animate) {
    backgroundStrip.classList.add("no-transition");
  }

  const centrePosition =
    (backgroundCentreIndex * backgroundCellWidth) +
    (backgroundCellWidth / 2);

  const translate = 50 - centrePosition;

  backgroundStrip.style.transform =
    `translateX(${translate}vw)`;

  if (!animate) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        backgroundStrip.classList.remove("no-transition");
      });
    });
  }
}


function normaliseBackgroundPosition() {
  let adjusted = false;

  if (backgroundCentreIndex < 6) {
    backgroundCentreIndex += 8;
    adjusted = true;
  }

  else if (backgroundCentreIndex > 17) {
    backgroundCentreIndex -= 8;
    adjusted = true;
  }

  if (adjusted) {
    updateBackgroundTransform(false);
  }
}


// Audio-reactive aura

const auraStage = document.querySelector("#auraStage");
const auraPath = document.querySelector("#auraPath");

const auraStopNear = document.querySelector("#auraStopNear");
const auraStopPeak = document.querySelector("#auraStopPeak");
const auraStopFar = document.querySelector("#auraStopFar");


function scaleHexColour(hex, factor) {
  const clean = hex.replace("#", "");

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);

  const clampChannel = value =>
    Math.max(
      0,
      Math.min(
        255,
        Math.round(value)
      )
    );

  return `rgb(${clampChannel(r * factor)}, ${clampChannel(g * factor)}, ${clampChannel(b * factor)})`;
}


const AURA_CENTER = 200;
const AURA_OUTER_R = 160;
const AURA_AMPLITUDE = 26;
const AURA_SEGMENTS = 40;
const AURA_SPEED = 0.35;

let auraFrameId = null;

let audioContext = null;
let audioAnalyser = null;
let audioFreqData = null;
let audioAnalyserReady = false;

let rhythmEnergy = 0;

const RHYTHM_HISTORY_SIZE = 30;

let bassHistory = [];
let trebleHistory = [];

let kickPulse = 0;
let melodyLevel = 0;


function setupAudioAnalyser() {
  if (audioAnalyserReady) {
    return;
  }

  try {
    audioPlayer.crossOrigin = "anonymous";

    audioContext = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    const source =
      audioContext.createMediaElementSource(audioPlayer);

    audioAnalyser =
      audioContext.createAnalyser();

    audioAnalyser.fftSize = 512;
    audioAnalyser.smoothingTimeConstant = 0.2;

    audioFreqData =
      new Uint8Array(audioAnalyser.frequencyBinCount);

    source.connect(audioAnalyser);
    audioAnalyser.connect(audioContext.destination);

    audioAnalyserReady = true;
  }

  catch (error) {
    console.log(
      "Audio analysis unavailable, aura will use its plain ambient sway:",
      error
    );
  }
}


function averageBins(start, end) {
  const clampedStart = Math.max(0, start);

  const clampedEnd =
    Math.min(audioFreqData.length, end);

  const count =
    Math.max(
      1,
      clampedEnd - clampedStart
    );

  let sum = 0;

  for (
    let i = clampedStart;
    i < clampedEnd;
    i += 1
  ) {
    sum += audioFreqData[i];
  }

  return sum / count / 255;
}


function rollingAverage(history, newValue) {
  history.push(newValue);

  if (history.length > RHYTHM_HISTORY_SIZE) {
    history.shift();
  }

  return (
    history.reduce(
      (a, b) => a + b,
      0
    ) /
    history.length
  );
}


function updateRhythmEnergy() {
  if (
    !audioAnalyserReady ||
    audioContext.state === "suspended"
  ) {
    return;
  }

  audioAnalyser.getByteFrequencyData(audioFreqData);

  const binHz =
    audioContext.sampleRate /
    2 /
    audioFreqData.length;

  const bassStart = 0;

  const bassEnd =
    Math.max(
      3,
      Math.round(220 / binHz)
    );

  const trebleStart =
    Math.max(
      bassEnd,
      Math.round(2000 / binHz)
    );

  const trebleEnd =
    Math.round(8000 / binHz);

  const midStart =
    Math.max(
      bassEnd,
      Math.round(300 / binHz)
    );

  const midEnd =
    Math.min(
      trebleStart,
      Math.round(2000 / binHz)
    );

  const bassLevel =
    averageBins(bassStart, bassEnd);

  const trebleLevel =
    averageBins(trebleStart, trebleEnd);

  const midLevel =
    averageBins(midStart, midEnd);

  melodyLevel +=
    (midLevel - melodyLevel) *
    0.06;

  const bassAverage =
    rollingAverage(
      bassHistory,
      bassLevel
    );

  const trebleAverage =
    rollingAverage(
      trebleHistory,
      trebleLevel
    );

  const bassHit =
    bassLevel > bassAverage * 1.35 &&
    bassLevel > 0.1;

  const trebleHit =
    trebleLevel > trebleAverage * 1.5 &&
    trebleLevel > 0.05;

  const isHit =
    bassHit ||
    trebleHit;

  const level =
    bassLevel * 0.65 +
    trebleLevel * 0.35;

  kickPulse *= 0.82;

  if (isHit) {
    kickPulse = 1;
  }

  const target =
    isHit
      ? Math.min(
          1,
          level * 1.6 + 0.25
        )
      : level;

  const smoothing =
    target > rhythmEnergy
      ? 0.8
      : 0.1;

  rhythmEnergy +=
    (target - rhythmEnergy) *
    smoothing;
}


function smoothClosedPath(points) {
  const n = points.length;

  let path =
    `M ${points[0].x} ${points[0].y} `;

  for (
    let i = 0;
    i < n;
    i += 1
  ) {
    const p0 =
      points[
        (i - 1 + n) %
        n
      ];

    const p1 = points[i];

    const p2 =
      points[
        (i + 1) %
        n
      ];

    const p3 =
      points[
        (i + 2) %
        n
      ];

    const cp1x =
      p1.x +
      (p2.x - p0.x) / 6;

    const cp1y =
      p1.y +
      (p2.y - p0.y) / 6;

    const cp2x =
      p2.x -
      (p3.x - p1.x) / 6;

    const cp2y =
      p2.y -
      (p3.y - p1.y) / 6;

    path +=
      `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y} `;
  }

  return path + "Z";
}


function auraBlobPath(
  time,
  seed,
  energy,
  reactivity,
  melody
) {
  const amplitude = AURA_AMPLITUDE;

  const outerBase =
    AURA_OUTER_R +
    energy *
    42 *
    reactivity;

  const points = [];

  for (
    let i = 0;
    i < AURA_SEGMENTS;
    i += 1
  ) {
    const angle =
      (i / AURA_SEGMENTS) *
      Math.PI *
      2;

    const flow =
      Math.sin(
        angle * 2 -
        time *
          (
            0.5 +
            melody * 1.1
          ) +
        seed * 0.5
      ) *
      (
        0.55 +
        melody * 0.55
      );

    const texture =
      Math.sin(
        angle * 5 +
        time * 0.9 +
        seed * 1.7
      ) *
      0.16 +

      Math.sin(
        angle * 7 -
        time * 1.3 +
        seed * 2.3
      ) *
      0.1;

    const wobble =
      flow +
      texture;

    const radius =
      outerBase +
      wobble *
      amplitude;

    points.push({
      x:
        AURA_CENTER +
        radius *
        Math.cos(angle),

      y:
        AURA_CENTER +
        radius *
        Math.sin(angle)
    });
  }

  return smoothClosedPath(points);
}


function auraFrame(now) {
  const time =
    (now / 1000) *
    AURA_SPEED;

  updateRhythmEnergy();

  const track = tracks[currentTrack];

  const reactivity =
    track.reactivity ?? 1;

  const highlightPunch =
    track.highlightPunch ?? 1;

  const melodySensitivity =
    track.melodySensitivity ?? 1;

  const punch =
    Math.max(
      rhythmEnergy,
      kickPulse
    );

  const shapeEnergy =
    Math.min(
      1,
      rhythmEnergy +
      kickPulse * 0.35
    );

  auraPath.setAttribute(
    "d",
    auraBlobPath(
      time,
      currentTrack * 2.1,
      shapeEnergy,
      reactivity,
      melodyLevel * melodySensitivity
    )
  );

  auraStopNear.setAttribute(
    "stop-color",
    scaleHexColour(
      track.auraColour,
      0.55
    )
  );

  auraStopFar.setAttribute(
    "stop-color",
    scaleHexColour(
      track.auraColour,
      0.4
    )
  );

  auraStopPeak.setAttribute(
    "stop-color",
    scaleHexColour(
      track.auraColour,
      1.1 +
      punch *
      1.3 *
      highlightPunch
    )
  );

  auraPath.style.fillOpacity =
    String(
      Math.min(
        1,
        0.22 +
        punch *
        1.05 *
        reactivity
      )
    );

  auraFrameId =
    requestAnimationFrame(auraFrame);
}


function startAura() {
  if (auraFrameId !== null) {
    return;
  }

  setupAudioAnalyser();

  if (
    audioContext &&
    audioContext.state === "suspended"
  ) {
    audioContext.resume();
  }

  auraStage.classList.add("is-active");

  auraFrameId =
    requestAnimationFrame(auraFrame);
}


function stopAura() {
  auraStage.classList.remove("is-active");

  kickPulse = 0;

  if (auraFrameId !== null) {
    cancelAnimationFrame(auraFrameId);

    auraFrameId = null;
  }
}


// Audio controls

function loadCurrentAudio() {
  audioPlayer.src =
    tracks[currentTrack].audio;

  audioPlayer.load();
}


async function playCurrentTrack() {
  loadCurrentAudio();

  try {
    await audioPlayer.play();

    isPlaying = true;

    updatePlayState();
  }

  catch (error) {
    console.log(
      "Playback blocked:",
      error
    );
  }
}


async function playAudio() {
  try {
    await audioPlayer.play();

    isPlaying = true;

    updatePlayState();
  }

  catch (error) {
    console.log(
      "Playback failed:",
      error
    );
  }
}


function pauseAudio() {
  audioPlayer.pause();

  isPlaying = false;

  updatePlayState();
}


function togglePlay() {
  if (audioPlayer.paused) {
    playAudio();
  }

  else {
    pauseAudio();
  }
}


function updatePlayState() {
  if (isPlaying) {
    playIcon.className = "pause-icon";

    playButton.setAttribute(
      "aria-label",
      "Pause"
    );
  }

  else {
    playIcon.className = "play-icon";

    playButton.setAttribute(
      "aria-label",
      "Play"
    );
  }

  updateRecordPositions();

  if (isPlaying) {
    startAura();
  }

  else {
    stopAura();
  }
}


// Record change animation

const KEYFRAMES = {
  "-2": {
    x: -205,
    y: 42,
    scale: 0.68,
    rotate: -18
  },

  "-1": {
    x: -142,
    y: 30,
    scale: 0.86,
    rotate: -14
  },

  "0": {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0
  },

  "1": {
    x: 142,
    y: 26,
    scale: 0.86,
    rotate: 14
  },

  "2": {
    x: 205,
    y: 38,
    scale: 0.68,
    rotate: 18
  }
};


function easeOutCubic(value) {
  return (
    1 -
    Math.pow(
      1 - value,
      3
    )
  );
}


function wrapOffset(offset) {
  const half =
    tracks.length / 2;

  return (
    (
      (
        (
          offset +
          half
        ) %
        tracks.length +
        tracks.length
      ) %
      tracks.length
    ) -
    half
  );
}


function centeredDiff(
  index,
  startIndex
) {
  const length = tracks.length;

  let distance =
    (
      (
        index -
        startIndex
      ) %
      length +
      length
    ) %
    length;

  const half =
    length / 2;

  if (distance > half) {
    distance -= length;
  }

  return distance;
}


function transformForOffset(offset) {
  const clamped =
    Math.max(
      -2,
      Math.min(
        2,
        offset
      )
    );

  const lowerKey =
    Math.floor(clamped);

  const upperKey =
    Math.ceil(clamped);

  const fraction =
    clamped -
    lowerKey;

  const lower =
    KEYFRAMES[String(lowerKey)];

  const upper =
    KEYFRAMES[String(upperKey)];

  const lerp =
    (a, b) =>
      a +
      (b - a) *
      fraction;

  const x =
    lerp(lower.x, upper.x);

  const y =
    lerp(lower.y, upper.y);

  const scale =
    lerp(lower.scale, upper.scale);

  const rotate =
    lerp(lower.rotate, upper.rotate);

  return (
    `translate(-50%, -50%) translate(${x}%, ${y}%) scale(${scale}) rotate(${rotate}deg)`
  );
}


function animateTransition(
  direction,
  steps,
  targetIndex
) {
  if (
    isTransitioning ||
    steps <= 0
  ) {
    return;
  }

  isTransitioning = true;

  audioPlayer.pause();

  isPlaying = false;

  updatePlayState();

  const startIndex = currentTrack;

  const shifts =
    direction === "next"
      ? steps
      : -steps;

  hiddenSide =
    direction === "next"
      ? "left"
      : "right";

  const baseOffsets =
    tracks.map(
      (_, index) =>
        -centeredDiff(
          index,
          startIndex
        )
    );

  const startCentreIndex =
    backgroundCentreIndex;

  recordsContainer.classList.add(
    "no-transition"
  );

  const shells =
    document.querySelectorAll(".record-shell");

  const duration =
    700 +
    Math.abs(shifts) *
    260;

  const startTime =
    performance.now();


  function frame(now) {
    const time =
      Math.min(
        1,
        (now - startTime) /
        duration
      );

    const progress =
      shifts *
      easeOutCubic(time);

    shells.forEach(shell => {
      const index =
        Number(shell.dataset.index);

      const offset =
        wrapOffset(
          baseOffsets[index] +
          progress
        );

      shell.style.transform =
        transformForOffset(offset);

      const absOffset =
        Math.abs(offset);

      shell.style.opacity =
        String(
          absOffset <= 1
            ? 1
            : Math.max(
                0,
                1 -
                (absOffset - 1)
              )
        );

      shell.style.zIndex =
        String(
          Math.round(
            4 -
            Math.abs(offset)
          )
        );
    });

    const effectiveCentreIndex =
      startCentreIndex -
      progress;

    const centrePosition =
      (effectiveCentreIndex * backgroundCellWidth) +
      (backgroundCellWidth / 2);

    backgroundStrip.style.transform =
      `translateX(${50 - centrePosition}vw)`;

    if (time < 1) {
      requestAnimationFrame(frame);
    }

    else {
      finishTransition(
        targetIndex,
        shifts
      );
    }
  }

  requestAnimationFrame(frame);
}


function finishTransition(
  targetIndex,
  shifts
) {
  currentTrack = targetIndex;
  visualTrack = targetIndex;

  backgroundCentreIndex -= shifts;

  document
    .querySelectorAll(".record-shell")
    .forEach(shell => {
      shell.style.transform = "";
      shell.style.opacity = "";
      shell.style.zIndex = "";
    });

  recordsContainer.classList.remove(
    "no-transition"
  );

  updateTrackList();
  updateRecordPositions();

  updateBackgroundTransform(false);

  normaliseBackgroundPosition();

  playCurrentTrack().then(() => {
    isTransitioning = false;
  });
}


function nextTrack() {
  animateTransition(
    "next",
    1,
    getNextIndexFrom(currentTrack)
  );
}


function previousTrack() {
  animateTransition(
    "previous",
    1,
    getPreviousIndexFrom(currentTrack)
  );
}


function selectTrack(targetIndex) {
  if (
    targetIndex === currentTrack ||
    isTransitioning
  ) {
    return;
  }

  const forwardDistance =
    wrapIndex(
      targetIndex -
      currentTrack
    );

  const backwardDistance =
    wrapIndex(
      currentTrack -
      targetIndex
    );

  const movingForward =
    forwardDistance <=
    backwardDistance;

  const direction =
    movingForward
      ? "next"
      : "previous";

  const steps =
    movingForward
      ? forwardDistance
      : backwardDistance;

  animateTransition(
    direction,
    steps,
    targetIndex
  );
}


// Timeline dragging

function setProgressVisual(percentage) {
  percentage =
    Math.max(
      0,
      Math.min(
        percentage,
        1
      )
    );

  progressFill.style.width =
    `${percentage * 100}%`;
}


function getPointerPercentage(event) {
  const rectangle =
    progressContainer.getBoundingClientRect();

  let percentage =
    (event.clientX - rectangle.left) /
    rectangle.width;

  percentage =
    Math.max(
      0,
      Math.min(
        percentage,
        1
      )
    );

  return percentage;
}


function updateProgress() {
  if (isDraggingProgress) {
    return;
  }

  if (
    !audioPlayer.duration ||
    Number.isNaN(audioPlayer.duration)
  ) {
    return;
  }

  const progress =
    audioPlayer.currentTime /
    audioPlayer.duration;

  setProgressVisual(progress);

  updateTime();
}


function applyScrubRecordMotion(
  newPercentage
) {
  if (lastScrubPercentage === null) {
    lastScrubPercentage = newPercentage;

    return;
  }

  const delta =
    newPercentage -
    lastScrubPercentage;

  scrubAngles[currentTrack] +=
    delta * 190;

  scrubAngles[currentTrack] =
    Math.max(
      -28,
      Math.min(
        28,
        scrubAngles[currentTrack]
      )
    );

  updateScrubVisuals();

  lastScrubPercentage = newPercentage;
}


function seekFromPointer(event) {
  if (
    !audioPlayer.duration ||
    Number.isNaN(audioPlayer.duration)
  ) {
    return;
  }

  const percentage =
    getPointerPercentage(event);

  applyScrubRecordMotion(percentage);

  audioPlayer.currentTime =
    audioPlayer.duration *
    percentage;

  setProgressVisual(percentage);

  updateTime();
}


progressContainer.addEventListener(
  "pointerdown",
  event => {
    if (!audioPlayer.duration) {
      return;
    }

    isDraggingProgress = true;

    lastScrubPercentage =
      getPointerPercentage(event);

    progressContainer.classList.add(
      "is-dragging"
    );

    progressContainer.setPointerCapture(
      event.pointerId
    );

    seekFromPointer(event);
  }
);


progressContainer.addEventListener(
  "pointermove",
  event => {
    if (!isDraggingProgress) {
      return;
    }

    seekFromPointer(event);
  }
);


function finishProgressDrag(event) {
  if (!isDraggingProgress) {
    return;
  }

  seekFromPointer(event);

  isDraggingProgress = false;
  lastScrubPercentage = null;

  progressContainer.classList.remove(
    "is-dragging"
  );

  if (
    progressContainer.hasPointerCapture(
      event.pointerId
    )
  ) {
    progressContainer.releasePointerCapture(
      event.pointerId
    );
  }
}


progressContainer.addEventListener(
  "pointerup",
  finishProgressDrag
);


progressContainer.addEventListener(
  "pointercancel",
  event => {
    isDraggingProgress = false;
    lastScrubPercentage = null;

    progressContainer.classList.remove(
      "is-dragging"
    );

    if (
      progressContainer.hasPointerCapture(
        event.pointerId
      )
    ) {
      progressContainer.releasePointerCapture(
        event.pointerId
      );
    }
  }
);


function formatTime(seconds) {
  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    Math.floor(
      seconds % 60
    );

  return (
    `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`
  );
}


function updateTime() {
  if (
    !audioPlayer.duration ||
    Number.isNaN(audioPlayer.duration)
  ) {
    timeDisplay.textContent =
      showElapsedTime
        ? "0:00"
        : "-0:00";

    return;
  }

  if (showElapsedTime) {
    timeDisplay.textContent =
      formatTime(
        Math.max(
          0,
          audioPlayer.currentTime
        )
      );
  }

  else {
    const remaining =
      Math.max(
        0,
        audioPlayer.duration -
        audioPlayer.currentTime
      );

    timeDisplay.textContent =
      `-${formatTime(remaining)}`;
  }
}


// Events

function toggleTimeDisplay() {
  showElapsedTime =
    !showElapsedTime;

  updateTime();
}


timeDisplay.addEventListener(
  "click",
  toggleTimeDisplay
);


timeDisplay.addEventListener(
  "keydown",
  event => {
    if (
      event.code === "Enter" ||
      event.code === "Space"
    ) {
      event.preventDefault();

      toggleTimeDisplay();
    }
  }
);


audioPlayer.addEventListener(
  "timeupdate",
  updateProgress
);


audioPlayer.addEventListener(
  "loadedmetadata",
  () => {
    updateProgress();
    updateTime();
  }
);


audioPlayer.addEventListener(
  "play",
  () => {
    isPlaying = true;

    updatePlayState();
  }
);


audioPlayer.addEventListener(
  "pause",
  () => {
    isPlaying = false;

    updatePlayState();
  }
);


audioPlayer.addEventListener(
  "ended",
  () => {
    isPlaying = false;

    updatePlayState();

    setProgressVisual(1);

    updateTime();
  }
);


playButton.addEventListener(
  "click",
  togglePlay
);


nextButton.addEventListener(
  "click",
  nextTrack
);


previousButton.addEventListener(
  "click",
  previousTrack
);


document.addEventListener(
  "keydown",
  event => {
    if (
      event.code === "Space" &&
      document.activeElement !== timeDisplay
    ) {
      event.preventDefault();

      togglePlay();
    }
  }
);


// Start the player

function initialisePlayer() {
  createRecords();
  createTrackList();
  createBackgroundStrip();

  currentTrack = 0;
  visualTrack = currentTrack;

  updateRecordPositions();
  updateTrackList();

  updateBackgroundTransform(false);

  loadCurrentAudio();

  setProgressVisual(0);

  updateTime();
}


initialisePlayer();