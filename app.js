async function render() {
  const params = new URLSearchParams(location.search);
  const sim = params.get('simulate');

  let log;
  try {
    if (sim) throw { code: sim, synthetic: true };
    const res = await fetch('data/log.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    log = await res.json();
    if (!log.length) throw new Error('기록 없음');
  } catch (e) {
    document.getElementById('status').textContent = `실패: ${e.code || e.message}`;
    document.getElementById('value').textContent = '표시할 값 없음';
    return;
  }

  const sorted = [...log].sort((a, b) => a.date_kst.localeCompare(b.date_kst));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  document.getElementById('value').textContent = `${latest.stored_value} ${latest.unit}`;
  document.getElementById('source').textContent = latest.source_url;
  document.getElementById('observed').textContent = latest.observed_at;
  document.getElementById('fetched').textContent = latest.fetched_at;

  if (prev) {
    const diff = (latest.stored_value - prev.stored_value).toFixed(2);
    document.getElementById('diff').textContent = `어제(${prev.date_kst}) 대비 ${diff >= 0 ? '+' : ''}${diff}`;
  } else {
    document.getElementById('diff').textContent = '아직 둘째 날 값 없음 (기록 조작하지 않음, 내일 다시 확인)';
  }
}

render();