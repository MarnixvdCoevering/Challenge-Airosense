// app.js

// ====== CONFIG (fill these in) ======
const SUPABASE_URL = "https://shkpjdqcnxygpmzrmsnq.supabase.co"; // <-- replace
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoa3BqZHFjbnh5Z3BtenJtc25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5NDU3ODgsImV4cCI6MjA4MDUyMTc4OH0.WjsIZRXcYxT-_ho88zQ1Ez2b9lCdYTv-dK7AUoVat70";                  // <-- replace

// Your sensor UUID (you already gave it):
const SENSOR_UUID = "06fb4b8e-a7e4-4a82-b8fa-305bc716b3d1";

// For MVP location (later can be GPS)
const DEFAULT_LOCATIE = "Zoetermeer";

// ====== UI refs ======
const startBtn = document.getElementById("startMetingBtn");
const fileInput = document.getElementById("microbitFileInput");
const statusText = document.getElementById("statusText");
const latestText = document.getElementById("latestText");

// ====== Get logged-in gebruiker UUID ======
// For now we store it in localStorage manually (Step 4).
function getGebruikerUuid() {
  const id = localStorage.getItem("gebruikerid");
  if (!id) {
    throw new Error("Geen gebruikerid gevonden. Zet localStorage.gebruikerid (Step 4).");
  }
  return id;
}

// ====== Supabase insert ======
async function insertMeting({ locatie, eco2, tvoc, gebruikerUuid }) {
  const url = `${SUPABASE_URL}/rest/v1/meting`;

  const payload = {
    locatie,
    eco2_waarde: Number(eco2),
    tvoc_waarde: Number(tvoc),
    gebruiker: gebruikerUuid,
    sensor: SENSOR_UUID
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

// ====== Parsing ======
function parseCSVTextToLatest(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) throw new Error("CSV is leeg.");

  // last non-empty line
  const lastLine = lines[lines.length - 1];
  const parts = lastLine.split(",").map(p => p.trim());

  // take last 2 numeric values in the line
  const nums = parts.map(p => Number(p)).filter(n => Number.isFinite(n));
  if (nums.length < 2) throw new Error("Kon eco2/tvoc niet vinden in CSV regel.");

  const tvoc = nums[nums.length - 1];
  const eco2 = nums[nums.length - 2];
  return { eco2, tvoc };
}

function parseHTMLDataLogToLatest(text) {
  // Grab last <tr>...</tr> and pull numbers from it.
  const trMatches = text.match(/<tr[\s\S]*?<\/tr>/gi);
  if (!trMatches || trMatches.length === 0) {
    // fallback: last 2 numbers in document
    const allNums = (text.match(/-?\d+(\.\d+)?/g) || []).map(Number).filter(n => Number.isFinite(n));
    if (allNums.length < 2) throw new Error("Geen meetwaarden gevonden in HTML.");
    return { eco2: allNums[allNums.length - 2], tvoc: allNums[allNums.length - 1] };
  }

  const lastTr = trMatches[trMatches.length - 1];
  const nums = (lastTr.match(/-?\d+(\.\d+)?/g) || []).map(Number).filter(n => Number.isFinite(n));
  if (nums.length < 2) throw new Error("Kon eco2/tvoc niet vinden in laatste HTML rij.");

  const tvoc = nums[nums.length - 1];
  const eco2 = nums[nums.length - 2];
  return { eco2, tvoc };
}

async function parseSelectedFile(file) {
  const text = await file.text();
  const name = (file.name || "").toLowerCase();

  // Try CSV first if file name indicates it
  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return parseCSVTextToLatest(text);
  }

  // Otherwise treat as HTML data log (MY_DATA.HTM)
  return parseHTMLDataLogToLatest(text);
}

// ====== Button wiring ======
startBtn.addEventListener("click", () => {
  console.log("Start meting clicked!");
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
    const { eco2, tvoc } = await parseSelectedFile(file);

    latestText.textContent = `Gevonden: eCO2=${eco2} ppm, TVOC=${tvoc}`;
    statusText.textContent = "Status: upload naar Supabase…";

    const gebruikerUuid = getGebruikerUuid();
    await insertMeting({
      locatie: DEFAULT_LOCATIE,
      eco2,
      tvoc,
      gebruikerUuid
    });

    statusText.textContent = "Status: ✅ meting opgeslagen!";
  } catch (err) {
    statusText.textContent = `Status: ❌ fout: ${err.message}`;
    console.error(err);
  }
});