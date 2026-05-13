import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

const BASE_URL = 'http://a4ae593b8e0d047f0900658b38b95f7a-354320350.us-east-1.elb.amazonaws.com:8080';

export const options = {
  stages: [
    { duration: '30s', target: 20  },  // ramp up
    { duration: '1m',  target: 50  },  // stress — triggers HPA
    { duration: '2m',  target: 100 },  // peak — HPA scales up
    { duration: '1m',  target: 50  },  // ramp down
    { duration: '30s', target: 0   },  // cool down
  ],
  thresholds: {
    http_req_failed:   ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health-check`);

  check(res, {
    'status 200': (r) => r.status === 200,
  });

  errorRate.add(res.status !== 200);

  sleep(0.1);
}
