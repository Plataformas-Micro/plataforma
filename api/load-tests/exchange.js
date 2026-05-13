import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = 'http://a4ae593b8e0d047f0900658b38b95f7a-354320350.us-east-1.elb.amazonaws.com:8080';

const CURRENCY_PAIRS = [
  ['USD', 'BRL'],
  ['EUR', 'BRL'],
  ['USD', 'EUR'],
  ['GBP', 'USD'],
  ['BRL', 'USD'],
];

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

export default function () {
  const pair = CURRENCY_PAIRS[Math.floor(Math.random() * CURRENCY_PAIRS.length)];
  const [from, to] = pair;

  const res = http.get(`${BASE_URL}/exchanges/${from}/${to}`, {
    headers: { 'id-account': 'load-test-account' },
  });

  check(res, { 'status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);

  sleep(0.3);
}
