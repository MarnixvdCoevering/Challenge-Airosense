// app.js

const SUPABASE_URL = "https://shkpjdqcnxygpmzrmsnq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoa3BqZHFjbnh5Z3BtenJtc25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDU3ODgsImV4cCI6MjA4MDUyMTc4OH0.WjsIZRXcYxT-_ho88zQ1Ez2b9lCdYTv-dK7AUoVat70";

const SENSOR_UUID = "06fb4b8e-a7e4-4a82-b8fa-305bc716b3d1";

const startBtn = document.getElementById("startMetingBtn");
const fileInput = document.getElementById("microbitFileInput");
const statusText = document.getElementById("statusText");
const statusLucht = document.getElementById("statusLucht");
const latestText = document.getElementById("latestText");
const gemeenteWFS =
  "https://service.pdok.nl/cbs/gebiedsindelingen/2025/wfs/v1_0" +
  "?service=WFS&version=2.0.0&request=GetFeature" +
  "&typeNames=gebiedsindelingen:gemeente_gegeneraliseerd" +
  "&outputFormat=application/json&srsName=EPSG:4326";

  const gemeenteDropdown = document.getElementById("gemeenteDropdown");

let selectedGemeente = ""; // <-- used for DB insert

async function loadGemeenten() {
  const res = await fetch(gemeenteWFS);
  const geojson = await res.json();

  const names = geojson.features
    .map(f => f?.properties?.statnaam)
    .filter(Boolean);

  // unique + sort NL
  const uniqueSorted = [...new Set(names)].sort((a,b)=>a.localeCompare(b, "nl"));

  uniqueSorted.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    gemeenteDropdown.appendChild(option);
  });
}

// enable upload only after selection
gemeenteDropdown.addEventListener("change", () => {
  selectedGemeente = gemeenteDropdown.value;
  startBtn.disabled = !selectedGemeente;

  // optional: remember it
  sessionStorage.setItem("selectedGemeente", selectedGemeente);
});

// restore selection on refresh (optional)
const saved = sessionStorage.getItem("selectedGemeente");
if (saved) {
  selectedGemeente = saved;
  gemeenteDropdown.value = saved;
  startBtn.disabled = false;
} else {
  startBtn.disabled = true;
}

// load on page start
loadGemeenten().catch(err => {
  console.error(err);
  statusText.textContent = "Status: ❌ kon gemeenten niet laden (check internet).";
});

// thresholds (simple & defensible for MVP)
const THRESHOLDS = {
  eco2_warn: 1000,
  eco2_danger: 2000,
  tvoc_warn: 220,     // ppb
  tvoc_danger: 660    // ppb
};

function classifyAirQuality(eco2, tvoc) {
  const e = Number(eco2);
  const t = Number(tvoc);

  if (e >= THRESHOLDS.eco2_danger || t >= THRESHOLDS.tvoc_danger) return "danger";
  if (e >= THRESHOLDS.eco2_warn || t >= THRESHOLDS.tvoc_warn) return "warn";
  return "ok";
}

function applyStatusUI(status) {
  const box = document.getElementById("resultBox");
  if (!box) return;

  box.classList.remove("ok", "warn", "danger");
  box.classList.add(status);

  // status text + readability
  if (status === "ok") statusLucht.textContent = "Status Luchtkwaliteit: ✅ luchtkwaliteit OK";
  if (status === "warn") statusLucht.textContent = "Status Luchtkwaliteit: ⚠️ verhoogd — ventileren";
  if (status === "danger") statusLucht.textContent = "Status Luchtkwaliteit: ❌ gevaarlijk — ventileer / verlaat";
}


function getGebruikerUuid() {
  const gebruikerString = sessionStorage.getItem("gebruiker");
  const gebruiker = JSON.parse(gebruikerString);
  const id = gebruiker.gebruikerid;
  if (!id) throw new Error("Geen gebruikerid gevonden. Zet localStorage.gebruikerid.");
  return id;
}

//includes raw_h2 and raw_eth
async function insertMeting({ locatie, eco2, tvoc, raw_h2, raw_eth, gebruikerUuid }) {
  const url = `${SUPABASE_URL}/rest/v1/meting`;

  const payload = {
    locatie,
    eco2_waarde: Number(eco2),
    tvoc_waarde: Number(tvoc),
    raw_h2_waarde: Number(raw_h2),
    raw_eth_waarde: Number(raw_eth),
    gebruiker: gebruikerUuid,
    sensor: SENSOR_UUID
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${text}`);
  return JSON.parse(text);
}

// If you ever use CSV, this assumes the last 4 numeric values are: eco2,tvoc,raw_h2,raw_eth
function parseCSVTextToLatest(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("CSV is leeg.");

  const lastLine = lines[lines.length - 1];
  const parts = lastLine.split(",").map(p => p.trim());
  const nums = parts.map(p => Number(p)).filter(n => Number.isFinite(n));

  if (nums.length < 4) throw new Error("Kon eco2/tvoc/raw_h2/raw_eth niet vinden in CSV regel.");

  const raw_eth = nums[nums.length - 1];
  const raw_h2 = nums[nums.length - 2];
  const tvoc = nums[nums.length - 3];
  const eco2 = nums[nums.length - 4];

  return { eco2, tvoc, raw_h2, raw_eth };
}

//reads last row numbers and maps correctly for your MY_DATA order
function parseHTMLDataLogToLatest(text) {
  const trMatches = text.match(/<tr[\s\S]*?<\/tr>/gi);
  if (!trMatches || trMatches.length === 0) {
    //last numbers in whole document
    const allNums = (text.match(/-?\d+(\.\d+)?/g) || []).map(Number).filter(n => Number.isFinite(n));
    if (allNums.length < 4) throw new Error("Geen meetwaarden gevonden in HTML.");
    return {
      eco2: allNums[allNums.length - 4],
      tvoc: allNums[allNums.length - 3],
      raw_h2: allNums[allNums.length - 2],
      raw_eth: allNums[allNums.length - 1]
    };
  }

  const lastTr = trMatches[trMatches.length - 1];
  const nums = (lastTr.match(/-?\d+(\.\d+)?/g) || []).map(Number).filter(n => Number.isFinite(n));
  if (nums.length < 4) throw new Error("Kon eco2/tvoc/raw_h2/raw_eth niet vinden in laatste HTML rij.");

  const raw_eth = nums[nums.length - 1];
  const raw_h2 = nums[nums.length - 2];
  const tvoc = nums[nums.length - 3];
  const eco2 = nums[nums.length - 4];

  return { eco2, tvoc, raw_h2, raw_eth };
}

async function parseSelectedFile(file) {
  const text = await file.text();
  const name = (file.name || "").toLowerCase();

  if (name.endsWith(".csv") || name.endsWith(".txt")) return parseCSVTextToLatest(text);
  return parseHTMLDataLogToLatest(text);
}

startBtn.addEventListener("click", () => {
  if (!selectedGemeente) {
    statusText.textContent = "Status: kies eerst een gemeente.";
    return;
  }
  statusText.textContent = "Status: kies micro:bit data bestand…";
  latestText.textContent = "";
  fileInput.value = "";
  fileInput.click();
});


fileInput.addEventListener("change", async () => {
  try {
    const file = fileInput.files?.[0];
    if (!file) return;

    statusText.textContent = "Status: bestand lezen…";
    const { eco2, tvoc, raw_h2, raw_eth } = await parseSelectedFile(file);

    // kleur bepalen + toepassen
    const status = classifyAirQuality(eco2, tvoc);
    applyStatusUI(status);

    latestText.textContent =
      `Gevonden: eCO2=${eco2} ppm, TVOC=${tvoc} ppb, raw_h2=${raw_h2}, raw_eth=${raw_eth}`;

    statusText.textContent = "Status: upload naar Supabase…";

    const gebruikerUuid = getGebruikerUuid();
    await insertMeting({
      locatie: selectedGemeente,
      eco2,
      tvoc,
      raw_h2,
      raw_eth,
      gebruikerUuid
    });

    statusText.textContent = "Status: ✅ meting opgeslagen!";
  } catch (err) {
    statusText.textContent = `Status: ❌ fout: ${err.message}`;
    console.error(err);
  }
});