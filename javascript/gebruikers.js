const supabaseUrl = "https://shkpjdqcnxygpmzrmsnq.supabase.co";
const supabaseKey = "sb_publishable_WSC4uJgY2EoUmwVVbzbgAA_VQrBAx5N";

const supabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

async function hashWachtwoord(wachtwoord) {
  const encoder = new TextEncoder();
  const data = encoder.encode(wachtwoord);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

const loginForm = document.querySelector(".login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value.toLowerCase();
    const wachtwoord = loginForm.wachtwoord.value;
    const hashedWachtwoord = await hashWachtwoord(wachtwoord);
    if (!email || !wachtwoord) {
      alert("Vul je email en wachtwoord in!");
      return;
    }

    const { data, error } = await supabase
      .from("gebruikeraccount")
      .select("*")
      .eq("emailadres", email)
      .eq("wachtwoord", hashedWachtwoord)
      .single();

    if (error || !data) {
      alert("Email of wachtwoord is verkeerd!");
      return;
    }

    sessionStorage.setItem("gebruiker", JSON.stringify(data));
    window.location.href = "mainscreen.html";
  });
}

function checkIngelogd() {
  const gebruiker = sessionStorage.getItem("gebruiker");
  if (!gebruiker) {
    window.location.replace("index.html");
  }
}

const form = document.getElementById("signup-form");
if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const gebruikersnaam = form.gebruikersnaam.value;
    const email = form.email.value.toLowerCase();
    const wachtwoord = form.wachtwoord.value;

    const hashedWachtwoord = await hashWachtwoord(wachtwoord);

    const { data, error } = await supabase
      .from("gebruikeraccount")
      .insert([
        {
          gebruikersnaam: gebruikersnaam,
          emailadres: email,
          wachtwoord: hashedWachtwoord
        }
      ]);

    if (error) {
      alert("Er ging iets fout: " + error.message);
    } else {
      alert("Gebruikersaccount is succesvol aangemaakt!");
      form.reset();
      window.location.href = "index.html";
    }
  });
}

async function logdata() {
  const gebruikerString = sessionStorage.getItem("gebruiker");
  const gebruiker = JSON.parse(gebruikerString);
  const gebruikerid = gebruiker.gebruikerid;

  console.log(gebruikerid);
}

const path = window.location.pathname;

if (
  path === "/" ||
  path.endsWith("/index.html") ||
  path.endsWith("/signup.html") ||
  path.endsWith("/index") ||
  path.endsWith("/signup")
) {

} else {
  checkIngelogd();
}