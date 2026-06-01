# Testes de Carga

Utilizamos o **[k6](https://k6.io/)** para validar a performance da plataforma sob carga e observar o comportamento do **autoscaling (HPA)** do gateway em tempo real. Os testes geram tráfego progressivo, capturam métricas de latência e taxa de erro, e nos permitem confirmar que o cluster escala horizontalmente quando a demanda aumenta.

!!! info "Por que k6?"
    O k6 descreve os cenários de carga em JavaScript, é leve, roda localmente e expõe thresholds (limiares) que fazem o teste falhar automaticamente caso a latência ou os erros ultrapassem os limites aceitáveis.

## Ferramenta — k6

O k6 é uma ferramenta de testes de carga de código aberto, voltada para desenvolvedores. Os cenários são escritos em JavaScript e executados pela CLI.

```bash title="Instalação (macOS)"
brew install k6
```

## Scripts

Mantemos quatro scripts em `api/load-tests/`, um para cada superfície relevante da plataforma. Todos definem **stages** (rampas de VUs) e **thresholds** de erro e latência.

!!! tip "Alvo configurável via BASE_URL"
    Os scripts apontam por padrão para o ELB de produção, mas aceitam sobrescrita via variável de ambiente. A forma recomendada de apontar para um alvo diferente (homologação, local, etc.) é definir `BASE_URL`:

    ```javascript
    const BASE_URL = __ENV.BASE_URL || 'http://...elb...:8080';
    ```

=== "gateway.js"

    Teste de estresse no gateway. Bate em `/health-check`, sobe até **100 VUs** para forçar o HPA a escalar, e exige erro abaixo de 5% e p95 abaixo de 2000 ms.

    ```javascript title="api/load-tests/gateway.js"
    export const options = {
      stages: [
        { duration: '30s', target: 20  },  // ramp up
        { duration: '1m',  target: 50  },  // stress — dispara o HPA
        { duration: '2m',  target: 100 },  // pico — HPA escala
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
      check(res, { 'status 200': (r) => r.status === 200 });
      sleep(0.1);
    }
    ```

=== "product.js"

    Exercita o serviço de produtos comparando **cache hit vs. miss** com métricas `Trend`. No `setup()` cria um produto; depois lista e busca o produto medindo a duração da primeira chamada (miss) contra as seguintes (hit).

    ```javascript title="api/load-tests/product.js"
    const cacheHitDuration  = new Trend('cache_hit_duration');
    const cacheMissDuration = new Trend('cache_miss_duration');

    export function setup() {
      const payload = JSON.stringify({ name: 'Load Test Product', price: 9.99, unit: 'un' });
      const res = http.post(`${BASE_URL}/products`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      return { productId: (res.headers['Location'] || '').split('/').pop() };
    }

    export default function (data) {
      http.get(`${BASE_URL}/products`);

      const getRes = http.get(`${BASE_URL}/products/${data.productId}`);
      check(getRes, { 'get 200': (r) => r.status === 200 });

      if (__ITER === 0) cacheMissDuration.add(getRes.timings.duration);
      else              cacheHitDuration.add(getRes.timings.duration);

      sleep(0.3);
    }
    ```

=== "exchange.js"

    Consulta cotações em **pares de moedas aleatórios**, enviando o header `id-account` exigido pelo serviço de câmbio.

    ```javascript title="api/load-tests/exchange.js"
    const CURRENCY_PAIRS = [
      ['USD', 'BRL'], ['EUR', 'BRL'], ['USD', 'EUR'],
      ['GBP', 'USD'], ['BRL', 'USD'],
    ];

    export default function () {
      const [from, to] = CURRENCY_PAIRS[Math.floor(Math.random() * CURRENCY_PAIRS.length)];

      const res = http.get(`${BASE_URL}/exchanges/${from}/${to}`, {
        headers: { 'id-account': 'load-test-account' },
      });

      check(res, { 'status 200': (r) => r.status === 200 });
      sleep(0.3);
    }
    ```

=== "order.js"

    Fluxo completo de pedidos. O `setup()` cria um produto; cada iteração faz `POST /orders`, `GET /orders`, `GET /orders/{id}` e `GET /orders/{id}?currency=BRL` (conversão de moeda), todos com o header `id-account`.

    ```javascript title="api/load-tests/order.js"
    const HEADERS = {
      'Content-Type': 'application/json',
      'id-account': 'load-test-account',
    };

    export default function (data) {
      const payload = JSON.stringify({ items: [{ idProduct: data.productId, quantity: 2 }] });

      const createRes = http.post(`${BASE_URL}/orders`, payload, { headers: HEADERS });
      check(createRes, { 'create 201': (r) => r.status === 201 });
      const orderId = (createRes.json() || {}).id;

      http.get(`${BASE_URL}/orders`, { headers: HEADERS });

      if (orderId) {
        http.get(`${BASE_URL}/orders/${orderId}`, { headers: HEADERS });
        http.get(`${BASE_URL}/orders/${orderId}?currency=BRL`, { headers: HEADERS });
      }

      sleep(0.3);
    }
    ```

## Como executar

Em um terminal, acompanhe o HPA escalando em tempo real. Em outro, dispare o teste apontando para o alvo desejado via `BASE_URL`.

```bash title="Terminal 1 — observar o HPA"
watch kubectl get hpa
```

```bash title="Terminal 2 — rodar o teste de carga"
BASE_URL=http://<seu-elb>:8080 k6 run load-tests/gateway.js
```

!!! note
    Sem `BASE_URL`, o script usa o alvo padrão definido no próprio arquivo. Substitua `gateway.js` por `product.js`, `exchange.js` ou `order.js` conforme a superfície que deseja testar.

## Resultados

Saída representativa do teste de gateway, com todos os thresholds satisfeitos:

```text title="k6 run load-tests/gateway.js"
     ✓ status 200

     checks.........................: 100.00% ✓ 58234     ✗ 0
     data_received..................: 12 MB   46 kB/s
     data_sent......................: 5.1 MB  20 kB/s
     http_req_blocked...............: avg=1.2ms   p(95)=2.1ms
     http_req_duration..............: avg=38.7ms  p(95)=144.3ms
       { expected_response:true }...: avg=38.7ms  p(95)=144.3ms
   ✓ http_req_failed................: 0.00%   ✓ 0         ✗ 58234
     http_reqs......................: 58234   227.4/s
     iteration_duration.............: avg=139ms   p(95)=251ms
     iterations.....................: 58234   227.4/s
     vus............................: 4       min=4       max=100
     vus_max........................: 100     min=100     max=100

     ✓ http_req_duration..............: p(95)=144.30ms (threshold p(95)<2000)
     ✓ http_req_failed................: rate=0.00%     (threshold rate<0.05)
```

!!! success "Resultado"
    Sob 100 VUs simultâneos, o gateway manteve **p(95) ≈ 144 ms** e **taxa de erro de 0%**, bem dentro dos thresholds (p95 < 2000 ms, erro < 5%). O HPA escalou o gateway horizontalmente durante o pico e o sistema absorveu a carga sem degradação perceptível.

## HPA em ação

Durante a execução, o HPA reage ao aumento de CPU provocado pelo tráfego e ajusta o número de réplicas do gateway, escalando até o limite máximo de **10 réplicas** e retornando ao baseline após a queda da carga.

| Fase       | VUs | CPU (média) | Réplicas |
|------------|-----|-------------|----------|
| Ramp-up    | 20  | ~35%        | 1        |
| Stress     | 50  | ~70%        | 2 → 4    |
| Pico       | 100 | ~85%        | 6 → 10   |
| Ramp-down  | 50  | ~50%        | 10 → 4   |
| Cooldown   | 0   | ~5%         | 4 → 1    |

```text title="kubectl get hpa"
NAME           REFERENCE              TARGETS    MINPODS  MAXPODS  REPLICAS  AGE
gateway-hpa    Deployment/gateway     85%/50%    1        10       10        12m
```

!!! tip "Saiba mais"
    Os detalhes da configuração do HPA estão em [Infra / EKS](infra/eks.md), e a discussão sobre distribuição de tráfego e gargalos está em [Load Balancing](bottlenecks.md).

## Demonstração

<iframe width="560" height="315" src="https://www.youtube.com/embed/JbQQmcl72c8" frameborder="0" allowfullscreen></iframe>
