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

const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
const map = L.map('map').setView([52.2, 5.3], 7);
const gemeenteWFS =
  "https://service.pdok.nl/cbs/gebiedsindelingen/2025/wfs/v1_0" +
  "?service=WFS" +
  "&version=2.0.0" +
  "&request=GetFeature" +
  "&typeNames=gebiedsindelingen:gemeente_gegeneraliseerd" + 
  "&outputFormat=application/json" +
  "&srsName=EPSG:4326";

fetch(gemeenteWFS)
  .then(response => {
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
  })
  .then(geojson => {
      console.log("GeoJSON data:", geojson);

      if (!geojson.features || geojson.features.length === 0) {
          console.error("No features found in WFS response.");
          return;
      }

      const gemeenteLayer = L.geoJSON(geojson, {
          style: {
              fillColor: "#ffffff",
              color: "#000000",
              weight: 1,
              fillOpacity: 0.7
          },
          onEachFeature: (feature, layer) => {
              const name = feature.properties.statnaam || feature.properties.STATNAAM || "Onbekend";
              layer.bindPopup(`<b>Gemeente: ${name}</b>`);

              layer.on('mouseover', function() {
                  this.setStyle({ fillColor: '#e0f0ff', weight: 2 });
              });
              layer.on('mouseout', function() {
                  this.setStyle({ fillColor: '#ffffff', weight: 1 });
              });
          }
      }).addTo(map);

      map.fitBounds(gemeenteLayer.getBounds());
  })
  .catch(err => {
      console.error("WFS error:", err);
      alert("Fout bij laden gemeentekaart. Controleer de console (F12) voor details.");
  });