# Arquitetura

## Visão geral

> A plataforma segue o padrão **API Gateway + Trusted Layer**. Todo tráfego externo passa
> pelo gateway, que valida o JWT antes de encaminhar para os serviços internos. Apenas o
> gateway é exposto à internet; os demais serviços só são acessíveis dentro do cluster.

```mermaid
flowchart LR
    NET([Internet]) -->|request| GW{{API Gateway}}

    subgraph TRUSTED["Trusted Layer (Amazon EKS)"]
        GW -->|/accounts/**| ACC[account-service]
        GW -->|/auth/**| AUTH[auth-service]
        GW -->|/products/**| PROD[product-service]
        GW -->|/orders/**| ORD[order-service]
        GW -->|/exchanges/**| EX[exchange-service]

        AUTH --> ACC
        ACC --> DB[(PostgreSQL)]
        PROD --> DB
        ORD --> DB
        ACC --> REDIS[(Redis)]
        PROD --> REDIS
        ORD -.->|Feign| PROD
        ORD -.->|Feign| EX
    end

    EX -->|REST| API3([AwesomeAPI])
```

A autenticação é resolvida **uma vez** no gateway: o token é validado junto ao `auth-service`
e o identificador da conta é injetado como header `id-account` nas requisições downstream.
Os serviços internos confiam nesse header e não revalidam o JWT.

---

## Fluxo de autenticação

```mermaid
sequenceDiagram
    participant U as Cliente
    participant G as Gateway
    participant A as auth-service
    participant S as Serviço interno

    U->>G: Requisição + cookie __store_jwt_token
    G->>A: POST /auth/solve (token)
    A-->>G: { idAccount }
    G->>S: Requisição + header id-account
    S-->>G: Resposta
    G-->>U: Resposta
    Note over G,S: Rotas públicas (login, register, logout, health-check)<br/>passam sem validação
```

---

## Fluxo de criação de pedido com câmbio

```mermaid
sequenceDiagram
    participant U as Cliente
    participant G as Gateway
    participant O as order-service
    participant P as product-service
    participant X as exchange-service
    participant E as AwesomeAPI

    U->>G: POST /orders { items }
    G->>O: + id-account
    loop para cada item
        O->>P: GET /products/{id} (Feign)
        P-->>O: preço do produto
    end
    O-->>U: 201 { pedido em USD }

    U->>G: GET /orders/{id}?currency=BRL
    G->>O: + id-account
    O->>X: GET /exchanges/USD/BRL (Feign)
    X->>E: GET taxa USD-BRL
    E-->>X: taxa
    X-->>O: { sell, buy }
    O-->>U: 200 { totais convertidos em BRL }
```

!!! info "Snapshot de preço"
    O preço usado no pedido é gravado em USD **no momento da criação** (snapshot imutável).
    A conversão de moeda só acontece sob demanda, na leitura. Veja
    [Bottlenecks](bottlenecks.md).

---

## Stack técnica

| Serviço | Linguagem | Framework | Dados |
|---|---|---|---|
| gateway-service | Java 25 | Spring Cloud Gateway | — |
| auth-service | Java 25 | Spring Boot 4.0.3 | — (valida via account) |
| account-service | Java 25 | Spring Boot 4.0.3 | PostgreSQL + Redis |
| product-service | Java 25 | Spring Boot 4.0.3 | PostgreSQL + Redis |
| order-service | Java 25 | Spring Boot 4.0.3 | PostgreSQL |
| exchange-service | Python 3.12 | FastAPI | — (AwesomeAPI) |

---

## Infraestrutura

- **Orquestração:** Amazon EKS (Kubernetes gerenciado) — veja [EKS](infra/eks.md).
- **CI/CD:** Jenkins, um `Jenkinsfile` por serviço — veja [CI/CD](infra/cicd.md).
- **Dados:** PostgreSQL e Redis em-cluster (ClusterIP).
- **Observabilidade:** Spring Boot Actuator + Micrometer → Prometheus → Grafana.
- **Escala:** Horizontal Pod Autoscaler (HPA) no gateway — veja [Testes de Carga](testes-de-carga.md).
- **Custos e modelo de nuvem:** [Custos & SLA](custos.md) · [PaaS](paas.md).
