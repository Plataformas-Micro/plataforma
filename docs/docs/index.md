# Plataformas Micro — Grupo 10

???+ info inline end "Semestre"
    2025.1

## Integrantes

| Aluno | RA |
|---|---|
| João Whitaker Citino | — |
| Mateus Porto Pereira Paiva | — |

---

## Sobre o Projeto

O projeto consiste em uma plataforma de e-commerce baseada em **microsserviços**, desenvolvida ao longo do semestre com foco em práticas modernas de engenharia de software: CI/CD, observabilidade, escalabilidade e segurança.

---

## Arquitetura

```mermaid
flowchart TD
    Client([Cliente])

    Client -->|HTTP :8080| GW

    subgraph K8s["☁ Amazon EKS"]
        GW[gateway-service\nSpring Cloud Gateway]

        GW -->|/auth/**| AUTH[auth-service\nSpring Boot]
        GW -->|/accounts/**| ACC[account-service\nSpring Boot]
        GW -->|/products/**| PROD[product-service\nSpring Boot]
        GW -->|/exchanges/**| EX[exchange-service\nFastAPI]

        AUTH --> DB[(PostgreSQL)]
        ACC  --> DB
        PROD --> DB
        ACC  --> REDIS[(Redis)]
        PROD --> REDIS

        PROM[Prometheus] -->|scrape| GW
        PROM -->|scrape| AUTH
        PROM -->|scrape| ACC
        PROM -->|scrape| PROD
        PROM -->|scrape| EX
        GRAF[Grafana] --> PROM
    end

    EX -->|REST| AWESOMEAPI([AwesomeAPI])
```

---

## Serviços

| Serviço | Tecnologia | Repositório |
|---|---|---|
| gateway-service | Spring Cloud Gateway 3 | [Plataformas-Micro/gateway-service](https://github.com/Plataformas-Micro/gateway-service) |
| auth-service | Spring Boot 3 + JWT | [Plataformas-Micro/auth-service](https://github.com/Plataformas-Micro/auth-service) |
| account-service | Spring Boot 3 | [Plataformas-Micro/account-service](https://github.com/Plataformas-Micro/account-service) |
| product-service | Spring Boot 3 | [Plataformas-Micro/product-service](https://github.com/Plataformas-Micro/product-service) |
| exchange-service | Python 3 + FastAPI | [Plataformas-Micro/exchange-service](https://github.com/Plataformas-Micro/exchange-service) |

---

## Bottlenecks Implementados

| # | Bottleneck | Solução |
|---|---|---|
| 1 | Latência em leituras repetidas | Redis Cache (account + product) |
| 2 | Falta de visibilidade em produção | Prometheus + Grafana |
| 3 | Ponto único de falha no gateway | Nginx + HPA (1–10 pods) |
| 4 | Acesso não autenticado | JWT via auth-service + filtro no gateway |
