const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, 'data', 'log.json');
const SOURCE_URL = 'https://api.frankfurter.app/latest?from=USD&to=KRW';

function todayKST() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();

  const record = {
    date_kst: todayKST(),
    source_url: SOURCE_URL,
    observed_at: data.date,
    fetched_at: new Date().toISOString(),
    raw_value: data.rates.KRW,
    stored_value: Number(data.rates.KRW.toFixed(2)),
    unit: 'KRW per USD'
  };

  const log = fs.existsSync(LOG_PATH) ? JSON.parse(fs.readFileSync(LOG_PATH)) : [];
  const idx = log.findIndex(r => r.date_kst === record.date_kst);
  if (idx >= 0) log[idx] = record;
  else log.push(record);

  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
  console.log('기록 완료:', record);
}

main().catch(e => console.error('실패:', e.message));