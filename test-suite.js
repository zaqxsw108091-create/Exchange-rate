const { getRetryDelay, formatElapsed, RETRY_CONFIG } = require('./app.js');

const TESTS = [
  {
    id: 'T-01',
    input: 'getRetryDelay(0, 1000)',
    expected: 1000,
    run: () => getRetryDelay(0, 1000),
  },
  {
    id: 'T-02',
    input: 'getRetryDelay(1, 1000)',
    expected: 2000,
    run: () => getRetryDelay(1, 1000),
  },
  {
    id: 'T-03',
    input: 'getRetryDelay(2, 1000)',
    expected: 4000,
    run: () => getRetryDelay(2, 1000),
  },
  {
    id: 'T-04',
    input: 'RETRY_CONFIG.maxRetries',
    expected: 3,
    run: () => RETRY_CONFIG.maxRetries,
  },
  {
    id: 'T-05',
    input: 'formatElapsed(지금 시각)',
    expected: '방금 전',
    run: (now) => formatElapsed(new Date(now).toISOString()),
  },
  {
    id: 'T-06',
    input: 'formatElapsed(5분 전)',
    expected: '5분 전',
    run: (now) => formatElapsed(new Date(now - 5 * 60 * 1000).toISOString()),
  },
  {
    id: 'T-07',
    input: 'formatElapsed(29분 전)',
    expected: '29분 전',
    run: (now) => formatElapsed(new Date(now - 29 * 60 * 1000).toISOString()),
  },
  {
    id: 'T-08',
    input: 'formatElapsed(30분 전)',
    expected: '오래된 데이터 (30분 전)',
    run: (now) => formatElapsed(new Date(now - 30 * 60 * 1000).toISOString()),
  },
  {
    id: 'T-09',
    input: 'formatElapsed(120분 전)',
    expected: '오래된 데이터 (120분 전)',
    run: (now) => formatElapsed(new Date(now - 120 * 60 * 1000).toISOString()),
  },
  {
    id: 'T-10',
    input: 'formatElapsed(null)',
    expected: null,
    run: () => formatElapsed(null),
  },
];

const originalDateNow = Date.now;
const fixedNow = Date.parse('2026-09-25T12:00:00.000Z');

Date.now = () => fixedNow;

let passed = 0;
let failed = 0;

try {
  for (const test of TESTS) {
    try {
      const actual = test.run(fixedNow);
      const ok = Object.is(actual, test.expected);

      if (ok) {
        console.log(`PASS ${test.id}: ${test.input} => ${JSON.stringify(actual)}`);
        passed++;
      } else {
        console.error(
          `FAIL ${test.id}: ${test.input} => expected ${JSON.stringify(test.expected)}, got ${JSON.stringify(actual)}`
        );
        failed++;
      }
    } catch (error) {
      console.error(`FAIL ${test.id}: ${test.input} => ${error.message}`);
      failed++;
    }
  }
} finally {
  Date.now = originalDateNow;
}

console.log(`\n결과: ${passed}/${TESTS.length} PASS, ${failed}/${TESTS.length} FAIL`);

if (failed > 0) {
  process.exitCode = 1;
}
