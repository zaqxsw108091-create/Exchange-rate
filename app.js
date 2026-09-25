const SOURCE_URL = 'https://api.frankfurter.dev/v1/latest?from=USD&to=KRW';
const EXTRA_KEY = 'exchange_log_extra';
let folderHandle = null; // 이번 창을 여는 동안만 기억됨 (새로고침하면 다시 선택 필요)

const FAILURES = {
  slow: '외부 서버 응답이 느립니다 (지연/타임아웃 상황을 가정한 합성 값)',
  unauthorized: '외부 원천 접근이 거부되었습니다 (401·403 합성 값)',
  limit: '외부 원천 호출 횟수 제한에 걸렸습니다 (합성 값)',
  offline: '네트워크에 연결할 수 없습니다 (오프라인 합성 값)',
  format: '외부 응답 형식이 예상과 다릅니다 (합성 값)'
};

const RETRY_CONFIG = { maxRetries: 3, baseDelayMs: 1000 };
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30분
let isFetching = false;

function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }

async function fetchWithRetry(url, maxRetries, baseDelayMs) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries) {
        setStatus('loading', '⏳ 재시도 중 (' + (attempt + 1) + '/' + maxRetries + ')...');
        await sleep(baseDelayMs * Math.pow(2, attempt)); // 1000 -> 2000 -> 4000
      }
    }
  }
  throw lastError;
}

function formatElapsed(iso) {
  if (!iso) return null;
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '방금 전';
  if (min < 30) return min + '분 전';
  return '오래된 데이터 (' + min + '분 전)';
}

function todayKST() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
  } catch (e) {
    return iso;
  }
}

function setStatus(kind, message) {
  const badge = document.getElementById('status');
  badge.className = 'status status--' + kind;
  badge.textContent = message;
  document.getElementById('retry').style.display = kind === 'error' ? 'inline-block' : 'none';
}

// "과제4번" 폴더에 직접 저장하기 위해 브라우저 권한을 받아온다 (최초 1회, 이 창에서만 유효)
async function connectFolder() {
  if (!window.showDirectoryPicker) {
    alert('이 브라우저는 폴더 자동 저장을 지원하지 않습니다. Chrome 또는 Edge 최신 버전을 사용해주세요.');
    return false;
  }
  try {
    folderHandle = await window.showDirectoryPicker();
    const folderBtn = document.getElementById('connect-folder');
    if (folderBtn) {
      folderBtn.textContent = '✓ 폴더 연결됨 (자동 저장 켜짐)';
      folderBtn.disabled = true;
    }
    return true;
  } catch (e) {
    return false;
  }
}

// 연결된 폴더의 data/log.json, data/log.js에 실제로 저장
async function saveToFolder(log) {
  if (!folderHandle) return false;
  try {
    const dataDir = await folderHandle.getDirectoryHandle('data', { create: true });

    const jsonHandle = await dataDir.getFileHandle('log.json', { create: true });
    const jsonWritable = await jsonHandle.createWritable();
    await jsonWritable.write(JSON.stringify(log, null, 2));
    await jsonWritable.close();

    const jsHandle = await dataDir.getFileHandle('log.js', { create: true });
    const jsWritable = await jsHandle.createWritable();
    await jsWritable.write('window.EXCHANGE_LOG = ' + JSON.stringify(log, null, 2) + ';\n');
    await jsWritable.close();

    return true;
  } catch (e) {
    console.error('폴더 저장 실패:', e);
    return false;
  }
}

// node fetch-and-log.js가 만든 data/log.js(원본 기록)에
// 브라우저에서 "지금 업데이트" 버튼으로 받아온 값을 겹쳐서 보여준다.
// 같은 날짜면 더 최신 것(브라우저 값)으로 덮어씀 — 파일 자체는 건드리지 않음.
function getMergedLog() {
  const embedded = window.EXCHANGE_LOG || [];
  let extra = [];
  try { extra = JSON.parse(localStorage.getItem(EXTRA_KEY) || '[]'); } catch (e) { extra = []; }
  const map = {};
  embedded.forEach(function (r) { map[r.date_kst] = r; });
  extra.forEach(function (r) { map[r.date_kst] = r; });
  return Object.values(map);
}

function getLatestAndPrev() {
  const sorted = getMergedLog().sort((a, b) => a.date_kst.localeCompare(b.date_kst));
  return { latest: sorted[sorted.length - 1], prev: sorted[sorted.length - 2] };
}

// 실패 상태여도 마지막 정상값(latest)은 그대로 화면에 남기고,
// "오래된 값일 수 있음" 안내만 붙인다 (값을 지우지 않음 = C17)
function paintValue(isStale) {
  const { latest, prev } = getLatestAndPrev();

  if (!latest) {
    document.getElementById('value').textContent = '표시할 값 없음';
    document.getElementById('source').textContent = '-';
    document.getElementById('observed').textContent = '-';
    document.getElementById('fetched').textContent = '-';
    document.getElementById('diff').textContent = '아직 기록이 없습니다. node fetch-and-log.js를 먼저 실행하세요.';
    document.getElementById('stale-note').style.display = 'none';
    return;
  }

  document.getElementById('value').textContent =
    latest.stored_value.toLocaleString('ko-KR') + ' ' + latest.unit;
  document.getElementById('source').innerHTML =
    '<a href="' + latest.source_url + '" target="_blank" rel="noopener">' + latest.source_url + '</a>';
  document.getElementById('observed').textContent = latest.observed_at;
  document.getElementById('fetched').textContent = fmtTime(latest.fetched_at);

  const diffEl = document.getElementById('diff');
  if (prev) {
    const diff = (latest.stored_value - prev.stored_value).toFixed(2);
    const sign = Number(diff) >= 0 ? '+' : '';
    diffEl.textContent = '어제(' + prev.date_kst + ') 대비 ' + sign + diff;
    diffEl.className = 'diff ' + (Number(diff) >= 0 ? 'diff--up' : 'diff--down');
  } else {
    diffEl.textContent = '아직 둘째 날 값 없음 (기록을 조작하지 않고, 다음 실제 날짜에 다시 확인)';
    diffEl.className = 'diff';
  }

  const ageEl = document.getElementById('cache-age');
  if (ageEl) {
    if (latest && latest.fetched_at) {
      ageEl.textContent = formatElapsed(latest.fetched_at);
      ageEl.style.display = 'block';
      const ms = Date.now() - new Date(latest.fetched_at).getTime();
      ageEl.className = ms >= STALE_THRESHOLD_MS ? 'cache-age--old' : '';
    } else {
      ageEl.style.display = 'none';
    }
  }

  const staleNote = document.getElementById('stale-note');
  if (isStale) {
    staleNote.style.display = 'block';
    staleNote.textContent =
      '마지막 정상값(' + latest.date_kst + ' 기준)을 그대로 유지 중입니다. 실시간 값이 아닐 수 있습니다.';
  } else {
    staleNote.style.display = 'none';
  }
}

function render() {
  const params = new URLSearchParams(location.search);
  const sim = params.get('simulate');

  // '느림'은 실제로 화면 갱신을 지연시켜서 응답이 늦게 오는 상황을 그대로 재현
  // (2초 대기 → 타임아웃으로 실패 처리, 그동안 마지막 정상값은 그대로 유지)
  if (sim === 'slow') {
    setStatus('loading', '⏳ 응답 대기 중...');
    paintValue(false);
    setTimeout(function () {
      setStatus('error', '⚠ ' + FAILURES.slow);
      paintValue(true);
    }, 2000);
    return;
  }

  if (sim) {
    setStatus('error', '⚠ ' + (FAILURES[sim] || '알 수 없는 오류 (합성 값)'));
    paintValue(true);
  } else {
    setStatus('ok', '● 정상');
    paintValue(false);
  }
}

(function init() {
  try {
    const retryBtn = document.getElementById('retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', function () {
        const url = new URL(location.href);
        url.searchParams.delete('simulate');
        location.href = url.toString();
      });
    }

    const updateBtn = document.getElementById('update-now');
    if (updateBtn) {
      updateBtn.addEventListener('click', updateNow);
    }

    const folderBtn = document.getElementById('connect-folder');
    if (folderBtn) {
      folderBtn.addEventListener('click', connectFolder);
    }

    render();
  } catch (e) {
    // 스크립트가 조용히 멈추지 않고, 무슨 문제인지 화면에 바로 보여줌
    const valueEl = document.getElementById('value');
    const statusEl = document.getElementById('status');
    if (valueEl) valueEl.textContent = '초기화 오류: ' + e.message;
    if (statusEl) {
      statusEl.textContent = '⚠ 스크립트 오류';
      statusEl.className = 'status status--error';
    }
    console.error(e);
  }
})();

// "지금 업데이트" 버튼 — 브라우저에서 바로 실제 값을 조회
async function updateNow() {
  if (isFetching) return; // 중복 요청 방지 (T-10)
  const btn = document.getElementById('update-now');
  const params = new URLSearchParams(location.search);
  if (params.get('simulate')) {
    // 실패 테스트 화면에서는 그 상태를 유지 (혼동 방지)
    return;
  }

  isFetching = true;
  btn.disabled = true;
  btn.textContent = '조회 중...';
  setStatus('loading', '⏳ 실시간 조회 중...');

  try {
    const res = await fetchWithRetry(SOURCE_URL, RETRY_CONFIG.maxRetries, RETRY_CONFIG.baseDelayMs);
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

    let extra = [];
    try { extra = JSON.parse(localStorage.getItem(EXTRA_KEY) || '[]'); } catch (e) { extra = []; }
    const idx = extra.findIndex(function (r) { return r.date_kst === record.date_kst; });
    if (idx >= 0) extra[idx] = record; else extra.push(record);
    localStorage.setItem(EXTRA_KEY, JSON.stringify(extra));

    // 폴더가 연결되어 있으면 data/log.json, data/log.js에 실제로 저장
    let savedToFile = false;
    if (folderHandle) {
      const merged = getMergedLog();
      savedToFile = await saveToFolder(merged);
    }

    setStatus('ok', savedToFile ? '● 정상 (방금 업데이트 + 파일 저장됨)' : '● 정상 (방금 업데이트됨)');
    paintValue(false);
  } catch (e) {
    setStatus('error', '⚠ ' + RETRY_CONFIG.maxRetries + '회 재시도 후에도 실패: ' + e.message);
    paintValue(true);
  } finally {
    isFetching = false;
    btn.disabled = false;
    btn.textContent = '지금 업데이트';
  }
}
