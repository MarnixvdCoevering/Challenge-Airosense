const supabaseUrl = "https://shkpjdqcnxygpmzrmsnq.supabase.co";
const supabaseKey = "sb_publishable_WSC4uJgY2EoUmwVVbzbgAA_VQrBAx5N";


const supabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);


async function fetchGebruikerData() {
  const { data, error } = await supabase
    .from('gebruikeraccount')
    .select('*');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Gebruikers:', data);
  }
}


const loginForm = document.querySelector(".login-form");
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // voorkomt dat het formulier de pagina reload

    const email = loginForm.email.value;
    const wachtwoord = loginForm.wachtwoord.value;

    if (!email || !wachtwoord) {
        alert("Vul je email en wachtwoord in!");
        return;
    }

    // checken bij Supabase
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

    // succesvol inloggen → data opslaan en doorsturen
    sessionStorage.setItem("gebruiker", JSON.stringify(data));
    window.location.href = "mainscreen.html";
});


function checkIngelogd() {
    const gebruiker = sessionStorage.getItem("gebruiker");
    if (!gebruiker) {
        window.location.href = "index.html";
    }
}


const form = document.getElementById("signup-form");
form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const gebruikersnaam = form.gebruikersnaam.value;
    const email = form.email.value;
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



const page = window.location.pathname;

if (page.includes("mainscreen.html")) {
    fetchGebruikerData();
}

if (!page.includes("index.html") && !page.includes("autorisatie.html") && !page.includes("signup.html")) {
    checkIngelogd();
}