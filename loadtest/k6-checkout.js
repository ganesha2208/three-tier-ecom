// k6 load test for ShopForge backend.
//
// Goal: ramp realistic browsing traffic against the live ALB, see the HPA
// fire, and find the first bottleneck. Not a benchmark — a diagnostic.
//
// Usage:
//   ALB=$(kubectl -n shopforge get ingress shopforge \
//           -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
//   k6 run -e ALB="http://$ALB" loadtest/k6-checkout.js
//
// Override stages from CLI if needed:
//   k6 run -e ALB="http://$ALB" -e PEAK_VUS=50 loadtest/k6-checkout.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const ALB = __ENV.ALB;
if (!ALB) {
  throw new Error('ALB env var is required, e.g. -e ALB="http://my-alb.elb.amazonaws.com"');
}
const PEAK_VUS = parseInt(__ENV.PEAK_VUS || '100', 10);

const listLatency = new Trend('list_products_ms');
const detailLatency = new Trend('product_detail_ms');
const checksPassed = new Rate('content_checks_passed');

export const options = {
  stages: [
    { duration: '1m', target: 20 },          // warm-up
    { duration: '2m', target: 20 },          // sustain at 20 — establish baseline
    { duration: '1m', target: PEAK_VUS },    // ramp to peak
    { duration: '3m', target: PEAK_VUS },    // hold peak — HPA should fire here
    { duration: '1m', target: 0 },           // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<800'],        // p95 < 800ms across the run
    http_req_failed:   ['rate<0.01'],        // < 1% error rate
    content_checks_passed: ['rate>0.99'],    // 99% of payload checks pass
  },
};

function listProducts() {
  const t0 = Date.now();
  const res = http.get(`${ALB}/api/v1/products`, {
    tags: { name: 'list_products' },
  });
  listLatency.add(Date.now() - t0);
  const ok = check(res, {
    'list status 200': (r) => r.status === 200,
    'list returns JSON array': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body) || Array.isArray(body.items);
      } catch (_) {
        return false;
      }
    },
  });
  checksPassed.add(ok);
  return res;
}

function productDetail(id) {
  const t0 = Date.now();
  const res = http.get(`${ALB}/api/v1/products/${id}`, {
    tags: { name: 'product_detail' },
  });
  detailLatency.add(Date.now() - t0);
  const ok = check(res, {
    'detail status 200': (r) => r.status === 200,
    'detail has id field': (r) => {
      try {
        return r.json('id') !== undefined;
      } catch (_) {
        return false;
      }
    },
  });
  checksPassed.add(ok);
}

export default function () {
  // 1. List products
  const listRes = listProducts();

  // 2. Pick a random product from the list, fetch its detail
  let products = [];
  try {
    const body = listRes.json();
    products = Array.isArray(body) ? body : body.items || [];
  } catch (_) {
    // body wasn't JSON — already counted as a failed check above
  }
  if (products.length > 0) {
    const pick = products[Math.floor(Math.random() * products.length)];
    if (pick && pick.id !== undefined) {
      productDetail(pick.id);
    }
  }

  // 3. Think time — a real user doesn't fire requests back-to-back
  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),
    'loadtest/results.json': JSON.stringify(data, null, 2),
  };
}

// Minimal text summary — k6's default printer isn't always available cross-version
function textSummary(data) {
  const m = data.metrics;
  const pick = (path) => {
    const parts = path.split('.');
    let cur = m;
    for (const p of parts) {
      if (!cur || cur[p] === undefined) return 'n/a';
      cur = cur[p];
    }
    return typeof cur === 'number' ? cur.toFixed(2) : String(cur);
  };
  return [
    '',
    '=== ShopForge k6 summary ===',
    `http_reqs total:            ${pick('http_reqs.values.count')}`,
    `http_req_failed rate:       ${pick('http_req_failed.values.rate')}`,
    `http_req_duration p95 (ms): ${pick('http_req_duration.values.p(95)')}`,
    `http_req_duration p99 (ms): ${pick('http_req_duration.values.p(99)')}`,
    `list_products_ms p95:       ${pick('list_products_ms.values.p(95)')}`,
    `product_detail_ms p95:      ${pick('product_detail_ms.values.p(95)')}`,
    `content_checks_passed rate: ${pick('content_checks_passed.values.rate')}`,
    '',
  ].join('\n');
}
