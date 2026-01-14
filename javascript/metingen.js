const supabaseUrl = "https://shkpjdqcnxygpmzrmsnq.supabase.co";
const supabaseKey = "sb_publishable_WSC4uJgY2EoUmwVVbzbgAA_VQrBAx5N";

const supabase = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);


const gebruikerString = sessionStorage.getItem("gebruiker");

if (!gebruikerString) {
  console.error("Geen gebruiker gevonden in sessionStorage, noob");
} else {
  const gebruiker = JSON.parse(gebruikerString);
  const naam = gebruiker.gebruikersnaam;
  const id = gebruiker.gebruikerid;

  async function fetchMetingenData() {
    const { data, error } = await supabase
      .from('meting')
      .select('locatie, eco2_waarde, tvoc_waarde, raw_h2_waarde, raw_eth_waarde, datum')
      .eq('gebruiker', id);

    if (error) {
      console.error('Error fetching data:', error);
      return;
    }

    const container = document.querySelector('.metingen');
    container.innerHTML = '';

    if (!data || data.length === 0) {
      container.innerHTML = '<p>Geen metingen gevonden</p>';
      return;
    }

    let table = `
      <table>
        <thead>
          <tr>
            <th>Naam</th>
            <th>Locatie</th>
            <th>eCO₂</th>
            <th>TVOC</th>
            <th>Raw H₂</th>
            <th>Raw Eth</th>
            <th>Datum</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach(meting => {
      table += `
        <tr>
          <td>${naam}</td>
          <td>${meting.locatie}</td>
          <td>${meting.eco2_waarde}</td>
          <td>${meting.tvoc_waarde}</td>
          <td>${meting.raw_h2_waarde}</td>
          <td>${meting.raw_eth_waarde}</td>
          <td>${new Date(meting.datum).toLocaleString()}</td>
        </tr>
      `;
    });

    table += `
        </tbody>
      </table>
    `;

    container.innerHTML = table;
  }

  const page = window.location.pathname;

  if (page.includes("vorigemetingen.html") || page.includes("vorigemetingen")) {
    fetchMetingenData();
  }
}