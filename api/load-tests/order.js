import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = __ENV.BASE_URL || 'http://a4ae593b8e0d047f0900658b38b95f7a-354320350.us-east-1.elb.amazonaws.com:8080';

const HEADERS = {
  'Content-Type': 'application/json',
  'id-account': 'load-test-account',
};

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
  const res = http.post(`${BASE_URL}/products`, payload, { headers: HEADERS });
  const location = res.headers['Location'] || '';
  const id = location.split('/').pop();
  return { productId: id };
}

export default function (data) {
  const productId = data.productId;
  if (!productId) {
    return;
  }

  const payload = JSON.stringify({ items: [{ idProduct: productId, quantity: 2 }] });
  const createRes = http.post(`${BASE_URL}/orders`, payload, { headers: HEADERS });
  check(createRes, { 'create 201': (r) => r.status === 201 });
  errorRate.add(createRes.status !== 201);

  const orderId = (createRes.json() || {}).id;
  sleep(0.3);

  const listRes = http.get(`${BASE_URL}/orders`, { headers: HEADERS });
  check(listRes, { 'list 200': (r) => r.status === 200 });
  errorRate.add(listRes.status !== 200);
  sleep(0.3);

  if (orderId) {
    const getRes = http.get(`${BASE_URL}/orders/${orderId}`, { headers: HEADERS });
    check(getRes, { 'get 200': (r) => r.status === 200 });
    errorRate.add(getRes.status !== 200);

    const convRes = http.get(`${BASE_URL}/orders/${orderId}?currency=BRL`, { headers: HEADERS });
    check(convRes, { 'convert 200': (r) => r.status === 200 });
    errorRate.add(convRes.status !== 200);
  }

  sleep(0.3);
}

export function teardown(data) {
  if (data.productId) {
    http.del(`${BASE_URL}/products/${data.productId}`, null, { headers: HEADERS });
  }
}
