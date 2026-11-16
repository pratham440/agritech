// Soil analysis: compares readings with typical healthy ranges.
exports.analyzeSoil = ({ ph, n, p, k, moisture }) => {
  const advice = []; let score = 100;
  const check = (ok, penalty, msg) => { if (!ok) { score -= penalty; advice.push(msg); } };
  check(ph >= 6 && ph <= 7.5, 20, ph < 6 ? 'Soil is acidic: add agricultural lime.' : 'Soil is alkaline: add gypsum or organic compost.');
  check(n >= 280, 20, 'Nitrogen is low: apply urea or green manure.');
  check(p >= 11, 15, 'Phosphorus is low: apply single super phosphate (SSP).');
  check(k >= 120, 15, 'Potassium is low: apply muriate of potash.');
  check(moisture >= 20 && moisture <= 60, 10, moisture < 20 ? 'Soil is dry: irrigate soon.' : 'Soil is waterlogged: improve drainage.');
  if (!advice.length) advice.push('Soil looks healthy. Keep your current practice.');
  return { score: Math.max(score, 0), advice };
};

// Pest alerts: rule-based on current conditions and the 7-day forecast.
exports.pestAlerts = (current, daily) => {
  const out = [];
  const rainy = (daily.precipitation_sum || []).some((r) => r > 20);
  if (current.relative_humidity_2m > 80 && current.temperature_2m >= 20 && current.temperature_2m <= 30)
    out.push({ level: 'high', title: 'Fungal disease risk', detail: 'Warm, humid air favours blight and rust. Inspect leaves and avoid evening irrigation.' });
  if (current.temperature_2m > 32 && current.relative_humidity_2m < 50)
    out.push({ level: 'medium', title: 'Aphid and mite risk', detail: 'Hot, dry weather speeds up sap-sucking pests. Check leaf undersides.' });
  if (rainy)
    out.push({ level: 'medium', title: 'Heavy rain ahead', detail: 'Over 20 mm expected in the next 7 days. Clear drains and delay spraying.' });
  return out;
};
