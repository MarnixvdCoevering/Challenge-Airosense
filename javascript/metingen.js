import '../database/databasescript.html';

async function fetchMetingenData() {
  const { data, error } = await supabase
    .from('metingen')
    .select('*');

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Data fetched:', data);
  }
}

fetchMetingenData()