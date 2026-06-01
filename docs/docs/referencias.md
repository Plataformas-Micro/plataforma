# Referências

## Repositórios do projeto

| Repositório | Descrição |
|---|---|
| [plataforma](https://github.com/Plataformas-Micro/plataforma) | Monorepo principal — compose, nginx, docs, load-tests |
| [gateway-service](https://github.com/Plataformas-Micro/gateway-service) | Spring Cloud Gateway — roteamento e autenticação JWT |
| [auth-service](https://github.com/Plataformas-Micro/auth-service) | Emissão e validação de tokens JWT |
| [auth](https://github.com/Plataformas-Micro/auth) | Biblioteca compartilhada — interfaces e modelos de auth |
| [account-service](https://github.com/Plataformas-Micro/account-service) | CRUD de contas com cache Redis |
| [account](https://github.com/Plataformas-Micro/account) | Biblioteca compartilhada — interfaces e modelos de account |
| [product-service](https://github.com/Plataformas-Micro/product-service) | CRUD de produtos com cache Redis |
| [product](https://github.com/Plataformas-Micro/product) | Biblioteca compartilhada — interfaces e modelos de product |
| [exchange-service](https://github.com/Plataformas-Micro/exchange-service) | Serviço de câmbio em Python/FastAPI |
| [exchange](https://github.com/Plataformas-Micro/exchange) | Biblioteca compartilhada — interfaces e modelos de exchange |
| [order-service](https://github.com/Plataformas-Micro/order-service) | Pedidos com snapshot de preço e conversão de moeda via Feign |
| [order](https://github.com/Plataformas-Micro/order) | Biblioteca compartilhada — interfaces e modelos de order |

---

## Tecnologias e ferramentas

### Backend
- [Spring Boot 4](https://spring.io/projects/spring-boot) — framework Java (Java 25) para os microsserviços
- [Spring Cloud Gateway](https://spring.io/projects/spring-cloud-gateway) — API Gateway reativo
- [Spring Cloud OpenFeign](https://spring.io/projects/spring-cloud-openfeign) — cliente REST declarativo entre serviços
- [FastAPI](https://fastapi.tiangolo.com/) — framework Python assíncrono (câmbio)

### Infraestrutura
- [Docker](https://www.docker.com/) — containerização
- [Docker Compose](https://docs.docker.com/compose/) — orquestração local
- [Amazon EKS](https://aws.amazon.com/eks/) — Kubernetes gerenciado na AWS
- [eksctl](https://eksctl.io/) — CLI para criação de clusters EKS

### Cache & Dados
- [Redis 7](https://redis.io/) — cache distribuído in-memory
- [PostgreSQL 17](https://www.postgresql.org/) — banco de dados relacional

### Observabilidade
- [Prometheus](https://prometheus.io/) — coleta de métricas
- [Grafana](https://grafana.com/) — visualização de métricas
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/reference/actuator/index.html) — endpoints de métricas
- [Micrometer](https://micrometer.io/) — facade de métricas para JVM

### CI/CD
- [Jenkins](https://www.jenkins.io/) — servidor de automação
- [Docker Buildx](https://docs.docker.com/buildx/working-with-buildx/) — build multi-plataforma (amd64 + arm64)

### Load Testing
- [k6](https://k6.io/) — ferramenta de load testing

### Documentação
- [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) — tema e framework de documentação

---

## Material do curso

- [Plataformas Micro — Insper](https://insper.github.io/platform/)
- [Template de Documentação](https://hsandmann.github.io/documentation.template/)
