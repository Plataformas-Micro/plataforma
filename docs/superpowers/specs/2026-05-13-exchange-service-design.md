# Exchange Service Design

**Date:** 2026-05-13  
**Scope:** Repositories `exchange` (Java shared library) and `exchange-service` (Python/FastAPI microservice), plus gateway routing and Docker Compose integration.

---

## Context

The platform uses a git-submodule microservices pattern. Each service has two repos: a shared library (DTOs + Feign client) and the actual microservice. The `exchange` library is Java (consumed by order-service via OpenFeign). The `exchange-service` is Python/FastAPI — the only non-JVM service in the platform.

The API Gateway injects an `id-account` header into every authenticated request before forwarding downstream (see `AuthorizationFilter.java`). The exchange-service reads this header and includes the value in its response.

Submodules already registered at `api/exchange` and `api/exchange-service`.

---

## Repository: `exchange` (Java library)

**Package:** `store.exchange`  
**GroupId/ArtifactId:** `store:exchange:1.0.0`

### DTO

```
ExchangeOut — record:
  Double sell
  Double buy
  String date
  String idAccount
```

Lombok `@Builder`.

### Feign Client

```java
@FeignClient(name="exchange", url="http://exchange-service:8080")
public interface ExchangeController {
    GET /exchanges/{from}/{to}
      @PathVariable String from
      @PathVariable String to
      @RequestHeader("id-account") String idAccount
      → ResponseEntity<ExchangeOut>
}
```

### Build

- Spring Boot 4.0.3 parent (no spring-boot-maven-plugin)
- Spring Cloud 2025.1.0, OpenFeign, Lombok, Java 25
- `application.yaml`: `spring.application.name: exchange`
- `Jenkinsfile`: mvn clean install

---

## Repository: `exchange-service` (Python/FastAPI)

**Language:** Python 3.12  
**Framework:** FastAPI + Uvicorn

### File Structure

```
exchange-service/
├── main.py            — FastAPI app, includes router
├── router.py          — GET /exchanges/{from_currency}/{to_currency}
├── service.py         — calls AwesomeAPI, maps response to ExchangeOut
├── model.py           — Pydantic ExchangeOut model
├── requirements.txt   — fastapi, uvicorn, requests
└── Dockerfile         — python:3.12-slim, uvicorn on port 8080
```

### model.py

```python
class ExchangeOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    sell: float
    buy: float
    date: str
    id_account: str = Field(alias="id-account", serialization_alias="id-account")
```

JSON response uses `id-account` (kebab-case) to match the exercise spec and the gateway header name.

### service.py

Calls AwesomeAPI:
```
GET https://economia.awesomeapi.com.br/json/last/{FROM}-{TO}
```

Response shape from AwesomeAPI:
```json
{ "USDBRL": { "bid": "5.10", "ask": "5.12", "create_date": "2026-05-13 10:00:00" } }
```

Mapping:
- `sell` ← `ask` (price to sell foreign currency)
- `buy` ← `bid` (price to buy foreign currency)
- `date` ← `create_date`
- `id_account` ← header `id-account` from request

### router.py

```
GET /exchanges/{from_currency}/{to_currency}
  Header: id-account (required)
  → 200 ExchangeOut JSON
  → 502 if AwesomeAPI call fails
```

### main.py

Creates FastAPI app, includes router.

### requirements.txt

```
fastapi
uvicorn
requests
```

### Dockerfile

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
```

---

## Gateway Integration

Add route to `gateway-service/src/main/resources/application.yaml`:

```yaml
- id: exchanges
  uri: http://exchange-service:8080
  predicates:
    - Path=/exchanges/**
```

---

## Compose Integration

Add service to `api/compose.yml` (after `product`, before `gateway`):

```yaml
  exchange-service:
    build:
      context: ./exchange-service
      dockerfile: Dockerfile
    hostname: exchange-service
    deploy:
      replicas: 1
```

No database — the service is stateless.

---

## Commit Strategy

Small, focused commits — one logical change per commit, no Claude co-author.

Rough order:
1. `exchange` library: pom.xml
2. `exchange` library: ExchangeOut DTO
3. `exchange` library: ExchangeController Feign client + application.yaml + Jenkinsfile
4. `exchange-service`: model.py
5. `exchange-service`: service.py
6. `exchange-service`: router.py + main.py
7. `exchange-service`: requirements.txt + Dockerfile
8. Gateway route
9. Compose service
10. Plataforma submodule pointer updates
