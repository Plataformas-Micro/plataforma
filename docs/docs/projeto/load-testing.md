# Load Testing

!!! abstract "Objetivo"
    Validar a performance da plataforma em produção (EKS) sob carga crescente e observar o **HPA escalando automaticamente** o gateway de 1 para 10 pods.

---

## Ferramenta — k6

[k6](https://k6.io/) é uma ferramenta de load testing open-source orientada a desenvolvedores, com scripts em JavaScript e métricas nativas de percentil.

```bash
brew install k6
```

---

## Scripts de Teste

### Gateway — Health Check

Testa o throughput máximo do gateway com ramp-up progressivo até **100 usuários virtuais**:

```javascript title="load-tests/gateway.js"
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = 'http://<ELB>:8080';

export const options = {
  stages: [
    { duration: '30s', target: 20  },  // (1)!
    { duration: '1m',  target: 50  },  // (2)!
    { duration: '2m',  target: 100 },  // (3)!
    { duration: '1m',  target: 50  },  // (4)!
    { duration: '30s', target: 0   },  // (5)!
  ],
  thresholds: {
    http_req_failed:   ['rate<0.05'],   // max 5% de erro
    http_req_duration: ['p(95)<2000'],  // p95 < 2s
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/health-check`);
  check(res, { 'status 200': (r) => r.status === 200 });
  errorRate.add(res.status !== 200);
  sleep(0.1);
}
```

1. Ramp-up gradual para 20 VUs em 30s — aquecimento.
2. Sobe para 50 VUs — estresse moderado, inicia pressão no HPA.
3. Pico de 100 VUs por 2 minutos — HPA deve escalar para múltiplos pods.
4. Ramp-down para 50 VUs — observar estabilização.
5. Cool-down até zero — HPA inicia redução gradual (cooldown de 5min).

### Exchange — Cotações Aleatórias

```javascript title="load-tests/exchange.js"
const CURRENCY_PAIRS = [
  ['USD', 'BRL'], ['EUR', 'BRL'], ['USD', 'EUR'],
  ['GBP', 'USD'], ['BRL', 'USD'],
];

export default function () {
  const [from, to] = CURRENCY_PAIRS[
    Math.floor(Math.random() * CURRENCY_PAIRS.length)
  ];
  const res = http.get(`${BASE_URL}/exchanges/${from}/${to}`, {
    headers: { 'id-account': 'load-test-account' },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(0.3);
}
```

### Product — Cache Hit vs Miss

```javascript title="load-tests/product.js"
const cacheHitDuration  = new Trend('cache_hit_duration');
const cacheMissDuration = new Trend('cache_miss_duration');

export default function (data) {
  const getRes = http.get(`${BASE_URL}/products/${data.productId}`);

  if (__ITER === 0) {
    cacheMissDuration.add(getRes.timings.duration); // (1)!
  } else {
    cacheHitDuration.add(getRes.timings.duration);  // (2)!
  }
}
```

1. Primeira iteração (iter 0) → cache miss, busca no banco.
2. Demais iterações → cache hit, retorna do Redis.

---

## Como Executar

**Terminal 1 — monitorar o HPA em tempo real:**

```bash
while true; do
  clear
  kubectl get hpa gateway
  echo ""
  kubectl get pods -l app=gateway
  sleep 2
done
```

**Terminal 2 — rodar o load test:**

```bash
k6 run load-tests/gateway.js
```

---

## Resultados — Gateway

```
  █ THRESHOLDS

    http_req_duration
    ✓ 'p(95)<2000'  p(95)=144.28ms

    http_req_failed
    ✓ 'rate<0.05'   rate=0.00%


  █ TOTAL RESULTS

    checks_total.......: 70596   235.31/s
    checks_succeeded...: 100.00%

    HTTP
    http_req_duration..: avg=134ms  min=124ms  p(90)=142ms  p(95)=144ms  max=1.16s
    http_req_failed....: 0.00%  0 out of 70596

    EXECUTION
    vus_max............: 100
    iterations.........: 70596  235.31/s
```

!!! success "Todos os thresholds passaram"
    - ✅ `p(95) = 144ms` — muito abaixo do limite de 2000ms
    - ✅ `0.00%` de erros — nenhuma requisição falhou
    - 🚀 **235 req/s** sustentados com 100 usuários virtuais

---

## HPA em Ação

Durante o teste, o HPA escalou o gateway progressivamente:

| Fase | VUs | CPU | Réplicas |
|---|---|---|---|
| Ramp-up | 20 | 18% | 1 |
| Stress | 50 | 52% | 3 |
| Pico | 100 | 89% | 10 |
| Ramp-down | 50 | 31% | 10 |
| Cooldown | 0 | 0% | 10 → 1* |

*Redução gradual após 5 minutos de cooldown.

```bash
kubectl get hpa gateway

NAME      REFERENCE              TARGETS      MINPODS   MAXPODS   REPLICAS   AGE
gateway   Deployment/gateway     cpu: 89%/50% 1         10        10         16m
```

---

## Vídeo de Demonstração

Demonstração ao vivo: load test rodando com o HPA escalando de 1 para 10 pods em tempo real.

<iframe
  width="100%"
  height="470"
  src="https://www.youtube.com/embed/JbQQmcl72c8"
  allowfullscreen>
</iframe>
