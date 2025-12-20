import '../database/databasescript.html';

async function fetchSensorData() {
  const { data, error } = await supabase
    .from('sensor')
    .select('*');

  if (error) {
    console.error('Error fetching data:', error);
  } else {
    console.log('Data fetched:', data);
  }
}

fetchSensorData()