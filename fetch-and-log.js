const fs = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, 'data', 'log.json');
const LOG_JS_PATH = path.join(__dirname, 'data', 'log.js');
const SOURCE_URL = 'https://api.frankfurter.dev/v1/latest?from=USD&to=KRW';

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

  // 1) 원본 데이터 저장 (증거용)
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  // 2) 브라우저에서 file://로 index.html을 그냥 열어도 보이도록
  //    <script> 태그로 불러올 수 있는 JS 파일로도 저장
  const jsContent = 'window.EXCHANGE_LOG = ' + JSON.stringify(log, null, 2) + ';\n';
  fs.writeFileSync(LOG_JS_PATH, jsContent);

  console.log('기록 완료:', record);
}

main().catch(e => console.error('실패:', e.message));
