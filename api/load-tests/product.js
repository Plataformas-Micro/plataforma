import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const cacheHitDuration = new Trend('cache_hit_duration');
const cacheMissDuration = new Trend('cache_miss_duration');

const BASE_URL = 'http://a4ae593b8e0d047f0900658b38b95f7a-354320350.us-east-1.elb.amazonaws.com:8080';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m',  target: 30 },
    { duration: '1m',  target: 30 },
    { duration: '30s', target: 0  },
  ],
  thresholds: {
    http_req_failed:   ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export function setup() {
  const payload = JSON.stringify({ name: 'Load Test Product', price: 9.99, unit: 'un' });
  const res = http.post(`${BASE_URL}/products`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });
  const location = res.headers['Location'] || '';
  const id = location.split('/').pop();
  return { productId: id };
}

export default function (data) {
  const productId = data.productId;

  const listRes = http.get(`${BASE_URL}/products`);
  check(listRes, { 'list 200': (r) => r.status === 200 });
  errorRate.add(listRes.status !== 200);
  sleep(0.3);

  if (productId) {
    const getRes = http.get(`${BASE_URL}/products/${productId}`);
    check(getRes, { 'get 200': (r) => r.status === 200 });
    errorRate.add(getRes.status !== 200);

    if (__ITER === 0) {
      cacheMissDuration.add(getRes.timings.duration);
    } else {
      cacheHitDuration.add(getRes.timings.duration);
    }
  }

  sleep(0.3);
}

export function teardown(data) {
  if (data.productId) {
    http.del(`${BASE_URL}/products/${data.productId}`);
  }
}
