let video;
let classifier;
let mappings = [];
let currentLabel = "Waiting for classification...";
let currentConfidence = 0;
let currentRecord = null;
let jsonLoaded = false;
let jsonError = false;

let floaters = [];
const CONFIDENCE_THRESHOLD = 0.6;
const MAX_FLOATERS = 60;

function preload() {
  mappings = loadJSON(
    "finalImageNetLabelsAndEmojis.json",
    jsonLoadedSuccessfully,
    jsonFailedToLoad,
  );
}

function jsonLoadedSuccessfully(data) {
  mappings = data;
  jsonLoaded = true;
}

function jsonFailedToLoad(error) {
  console.error("Could not load JSON dataset:", error);
  jsonError = true;
  mappings = [];
}

function setup() {
  createCanvas(960, 720);
  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();
  classifier = ml5.imageClassifier("MobileNet", { flipped: true });
  classifier.classifyStart(video, gotResults);
}

function normalizeLabel(labelText) {
  return String(labelText).toLowerCase().trim();
}

function firstTerm(labelText) {
  return normalizeLabel(labelText).split(",")[0].trim();
}

function labelTerms(labelText) {
  return normalizeLabel(labelText)
    .split(",")
    .map(function (term) {
      return term.trim();
    })
    .filter(function (term) {
      return term.length > 0;
    });
}

function findMapping(modelLabel) {
  if (!jsonLoaded || !Array.isArray(mappings)) return null;
  let modelFull = normalizeLabel(modelLabel);
  let modelFirst = firstTerm(modelLabel);
  let modelTerms = labelTerms(modelLabel);

  for (let item of mappings) {
    if (!item || !item.label) continue;
    if (modelFull === normalizeLabel(item.label)) return item;
  }

  for (let item of mappings) {
    if (!item || !item.label) continue;
    if (modelFirst === firstTerm(item.label)) return item;
  }

  for (let item of mappings) {
    if (!item || !item.label) continue;
    let datasetTerms = labelTerms(item.label);
    for (let modelTerm of modelTerms) {
      for (let datasetTerm of datasetTerms) {
        if (modelTerm === datasetTerm) return item;
      }
    }
  }

  for (let item of mappings) {
    if (!item || !item.label) continue;
    let datasetTerms = labelTerms(item.label);
    for (let modelTerm of modelTerms) {
      for (let datasetTerm of datasetTerms) {
        if (modelTerm.length < 4 || datasetTerm.length < 4) continue;
        if (modelTerm.includes(datasetTerm) || datasetTerm.includes(modelTerm))
          return item;
      }
    }
  }
  console.log("No mapping found for:", modelLabel);
  return null;
}

function gotResults(results) {
  if (!results || results.length === 0) return;
  currentLabel = results[0].label;
  currentConfidence = results[0].confidence;
  currentRecord = findMapping(currentLabel);
  console.log("MobileNet label:", currentLabel);
  console.log("Confidence:", currentConfidence);
  console.log("Matching record:", currentRecord);
}

class Floater {
  constructor(emoji) {
    this.emoji = emoji;
    this.x = random(width);
    this.y = height + 40;
    this.size = random(30, 70);
    this.speed = random(2, 5);
    this.wobbleOffset = random(TWO_PI);
    this.wobbleAmount = random(10, 30);
    this.alpha = 255;
  }

  update() {
    this.y -= this.speed;

    if (this.y < height * 0.25) {
      this.alpha -= 4;
    }
  }

  show() {
    push();
    textAlign(CENTER, CENTER);
    textSize(this.size);
    fill(255, this.alpha);
    let wobbleX =
      this.x + sin(frameCount * 0.05 + this.wobbleOffset) * this.wobbleAmount;
    text(this.emoji, wobbleX, this.y);
    pop();
  }

  isDead() {
    return this.y < -50 || this.alpha <= 0;
  }
}

function spawnFloaters() {
  if (
    currentConfidence > CONFIDENCE_THRESHOLD &&
    currentRecord &&
    currentRecord.emoji &&
    floaters.length < MAX_FLOATERS
  ) {
    if (frameCount % 5 === 0) {
      for (let i = 0; i < 2; i++) {
        floaters.push(new Floater(currentRecord.emoji));
      }
    }
  }
}

javascript;
spawnFloaters();
for (let i = floaters.length - 1; i >= 0; i--) {
  floaters[i].update();
  floaters[i].show();
  if (floaters[i].isDead()) {
    floaters.splice(i, 1);
  }
}

function draw() {
  image(video, 0, 0, width, height);

  spawnFloaters();
  for (let i = floaters.length - 1; i >= 0; i--) {
    floaters[i].update();
    floaters[i].show();
    if (floaters[i].isDead()) {
      floaters.splice(i, 1);
    }
  }

  fill(0, 190);
  noStroke();
  rect(20, 20, 820, 300, 12);
  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  text("STEP 4: MATCH THE MOBILENET LABEL", 40, 42);
  text("Model label: " + currentLabel, 40, 82);
  text("Confidence: " + nf(currentConfidence * 100, 2, 1) + "%", 40, 115);
  if (jsonError) {
    fill(255, 100, 100);
    text("JSON: could not be loaded.", 40, 155);
  } else if (!jsonLoaded) {
    fill(255, 220, 120);
    text("JSON: still loading...", 40, 155);
  } else {
    fill(180, 255, 180);
    text("JSON records loaded: " + mappings.length, 40, 155);
    fill(255);
    if (currentRecord) {
      text("Workshop category: " + currentRecord.workshopCategory, 40, 205);
      text("Emoji: " + currentRecord.emoji, 40, 245);
      text("Match source: " + currentRecord.label, 40, 280);
    } else {
      fill(255, 150, 150);
      text("No matching JSON record found.", 40, 205);
      text("Emoji: ❓", 40, 245);
    }
  }
}
