const supabaseUrl = "https://shkpjdqcnxygpmzrmsnq.supabase.co";
const supabaseKey = "sb_publishable_WSC4uJgY2EoUmwVVbzbgAA_VQrBAx5N";

const supabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);

const loginForm = document.querySelector(".login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = loginForm.email.value.toLowerCase();
    const wachtwoord = loginForm.wachtwoord.value;
    if (!email || !wachtwoord) {
      alert("Vul je email en wachtwoord in!");
      return;
    }

    const { data, error } = await supabase
      .from("gebruikeraccount")
      .select("*")
      .eq("emailadres", email)
      .eq("wachtwoord", wachtwoord)
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

    const { data, error } = await supabase
      .from("gebruikeraccount")
      .insert([
        {
          gebruikersnaam: gebruikersnaam,
          emailadres: email,
          wachtwoord: wachtwoord
        }
      ]);

    if (error) {
      alert("Er ging iets fout: " + error.message);
    } else {
      alert("Gebruiker succesvol aangemaakt!");
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
  path.endsWith("/signup.html")
) {

} else {
  checkIngelogd();
}