# Exchange Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the `exchange` Java shared library and `exchange-service` Python/FastAPI microservice, then wire them into the gateway and Docker Compose so the service is runnable locally.

**Architecture:** The `exchange` shared library (`store:exchange:1.0.0`) holds the `ExchangeOut` DTO and a Feign client interface for Java consumers (order-service). The `exchange-service` is a Python/FastAPI application with four files (model, service, router, main) that proxies AwesomeAPI for real-time currency rates and echoes the authenticated user's `id-account` in every response. The gateway routes `/exchanges/**` to the service container via the Docker Compose hostname `exchange-service`.

**Tech Stack:** Java 25 / Spring Boot 4.0.3 / OpenFeign / Lombok (library); Python 3.12 / FastAPI / Pydantic v2 / Requests / Uvicorn (service); AwesomeAPI (external rate provider).

> **Note:** The project has no test infrastructure. TDD steps are omitted. All commits must omit the Co-Authored-By trailer.

---

## File Map

### `api/exchange/` (library repo)
| File | Action |
|---|---|
| `pom.xml` | Create |
| `src/main/java/store/exchange/ExchangeOut.java` | Create |
| `src/main/java/store/exchange/ExchangeController.java` | Create |
| `src/main/resources/application.yaml` | Create |
| `Jenkinsfile` | Create |

### `api/exchange-service/` (Python service repo)
| File | Action |
|---|---|
| `model.py` | Create |
| `service.py` | Create |
| `router.py` | Create |
| `main.py` | Create |
| `requirements.txt` | Create |
| `Dockerfile` | Create |

### Integrations (existing repos)
| File | Action |
|---|---|
| `api/gateway-service/src/main/resources/application.yaml` | Modify — add route |
| `api/compose.yml` | Modify — add service |

---

## Task 1: `exchange` library — pom.xml

**Files:**
- Create: `api/exchange/pom.xml`

- [ ] **Step 1: Create the Maven POM**

  Create `api/exchange/pom.xml`:

  ```xml
  <?xml version="1.0" encoding="UTF-8"?>
  <project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
      <modelVersion>4.0.0</modelVersion>
      <parent>
          <groupId>org.springframework.boot</groupId>
          <artifactId>spring-boot-starter-parent</artifactId>
          <version>4.0.3</version>
          <relativePath/>
      </parent>

      <groupId>store</groupId>
      <artifactId>exchange</artifactId>
      <version>1.0.0</version>
      <name>exchange</name>

      <properties>
          <java.version>25</java.version>
          <spring-cloud.version>2025.1.0</spring-cloud.version>
          <maven.compiler.proc>full</maven.compiler.proc>
      </properties>

      <dependencies>
          <dependency>
              <groupId>org.springframework.cloud</groupId>
              <artifactId>spring-cloud-starter-openfeign</artifactId>
          </dependency>
          <dependency>
              <groupId>org.projectlombok</groupId>
              <artifactId>lombok</artifactId>
              <optional>true</optional>
          </dependency>
      </dependencies>

      <dependencyManagement>
          <dependencies>
              <dependency>
                  <groupId>org.springframework.cloud</groupId>
                  <artifactId>spring-cloud-dependencies</artifactId>
                  <version>${spring-cloud.version}</version>
                  <type>pom</type>
                  <scope>import</scope>
              </dependency>
          </dependencies>
      </dependencyManagement>

      <build>
          <plugins>
              <plugin>
                  <groupId>org.apache.maven.plugins</groupId>
                  <artifactId>maven-compiler-plugin</artifactId>
                  <configuration>
                      <annotationProcessorPaths>
                          <path>
                              <groupId>org.projectlombok</groupId>
                              <artifactId>lombok</artifactId>
                          </path>
                      </annotationProcessorPaths>
                      <source>${java.version}</source>
                      <target>${java.version}</target>
                      <release>${java.version}</release>
                  </configuration>
              </plugin>
          </plugins>
      </build>

  </project>
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd api/exchange
  git add pom.xml
  git commit -m "add maven pom"
  ```

---

## Task 2: `exchange` library — ExchangeOut DTO

**Files:**
- Create: `api/exchange/src/main/java/store/exchange/ExchangeOut.java`

- [ ] **Step 1: Create `ExchangeOut`**

  Create `api/exchange/src/main/java/store/exchange/ExchangeOut.java`:

  ```java
  package store.exchange;

  import com.fasterxml.jackson.annotation.JsonProperty;
  import lombok.Builder;

  @Builder
  public record ExchangeOut(

      Double sell,
      Double buy,
      String date,
      @JsonProperty("id-account") String idAccount

  ) {

  }
  ```

  > `@JsonProperty("id-account")` maps the kebab-case JSON field from the Python service to the `idAccount` Java field during Feign deserialization.

- [ ] **Step 2: Commit**

  ```bash
  cd api/exchange
  git add src/
  git commit -m "add ExchangeOut DTO"
  ```

---

## Task 3: `exchange` library — Feign client + config

**Files:**
- Create: `api/exchange/src/main/java/store/exchange/ExchangeController.java`
- Create: `api/exchange/src/main/resources/application.yaml`
- Create: `api/exchange/Jenkinsfile`

- [ ] **Step 1: Create `ExchangeController`**

  Create `api/exchange/src/main/java/store/exchange/ExchangeController.java`:

  ```java
  package store.exchange;

  import org.springframework.cloud.openfeign.FeignClient;
  import org.springframework.http.ResponseEntity;
  import org.springframework.web.bind.annotation.GetMapping;
  import org.springframework.web.bind.annotation.PathVariable;
  import org.springframework.web.bind.annotation.RequestHeader;

  @FeignClient(
      name = "exchange",
      url = "http://exchange-service:8080"
  )
  public interface ExchangeController {

      @GetMapping("/exchanges/{from}/{to}")
      ResponseEntity<ExchangeOut> getRate(
          @PathVariable String from,
          @PathVariable String to,
          @RequestHeader("id-account") String idAccount
      );

  }
  ```

- [ ] **Step 2: Create `application.yaml`**

  Create `api/exchange/src/main/resources/application.yaml`:

  ```yaml
  spring:
    application:
      name: exchange
  ```

- [ ] **Step 3: Create `Jenkinsfile`**

  Create `api/exchange/Jenkinsfile`:

  ```groovy
  pipeline {

      agent any

      stages {
          stage('Build') {
              steps {
                  sh 'mvn -B -DskipTests clean install'
              }
          }
      }

  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  cd api/exchange
  git add src/main/java/store/exchange/ExchangeController.java src/main/resources/application.yaml Jenkinsfile
  git commit -m "add ExchangeController feign client, application.yaml and Jenkinsfile"
  ```

---

## Task 4: Build and install the `exchange` library

The library must be installed to the local Maven repository before any Java consumer can depend on it.

- [ ] **Step 1: Build and install**

  ```bash
  cd api/exchange
  mvn clean install
  ```

  Expected: `BUILD SUCCESS` and `store:exchange:1.0.0` installed to `~/.m2/repository/store/exchange/1.0.0/`.

---

## Task 5: `exchange-service` — model.py

**Files:**
- Create: `api/exchange-service/model.py`

- [ ] **Step 1: Create `model.py`**

  Create `api/exchange-service/model.py`:

  ```python
  from pydantic import BaseModel, ConfigDict, Field


  class ExchangeOut(BaseModel):
      model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

      sell: float
      buy: float
      date: str
      id_account: str = Field(serialization_alias="id-account")
  ```

  > `serialize_by_alias=True` makes FastAPI serialize `id_account` as `"id-account"` in JSON responses.
  > `populate_by_name=True` allows constructing the model using the Python field name `id_account`.

- [ ] **Step 2: Commit**

  ```bash
  cd api/exchange-service
  git add model.py
  git commit -m "add ExchangeOut pydantic model"
  ```

---

## Task 6: `exchange-service` — service.py

**Files:**
- Create: `api/exchange-service/service.py`

- [ ] **Step 1: Create `service.py`**

  Create `api/exchange-service/service.py`:

  ```python
  import requests
  from fastapi import HTTPException
  from model import ExchangeOut


  def get_exchange(from_currency: str, to_currency: str, id_account: str) -> ExchangeOut:
      from_upper = from_currency.upper()
      to_upper = to_currency.upper()
      key = f"{from_upper}{to_upper}"
      url = f"https://economia.awesomeapi.com.br/json/last/{from_upper}-{to_upper}"

      try:
          response = requests.get(url, timeout=5)
          response.raise_for_status()
          data = response.json()[key]
          return ExchangeOut(
              sell=float(data["ask"]),
              buy=float(data["bid"]),
              date=data["create_date"],
              id_account=id_account,
          )
      except (requests.RequestException, KeyError, ValueError) as e:
          raise HTTPException(status_code=502, detail=f"Exchange API error: {str(e)}")
  ```

  > AwesomeAPI response shape for `USD-BRL`:
  > ```json
  > { "USDBRL": { "bid": "5.08", "ask": "5.09", "create_date": "2026-05-13 10:00:00", ... } }
  > ```
  > `sell` ← `ask` (price to buy the foreign currency), `buy` ← `bid` (price to sell it).

- [ ] **Step 2: Commit**

  ```bash
  cd api/exchange-service
  git add service.py
  git commit -m "add exchange service calling AwesomeAPI"
  ```

---

## Task 7: `exchange-service` — router.py and main.py

**Files:**
- Create: `api/exchange-service/router.py`
- Create: `api/exchange-service/main.py`

- [ ] **Step 1: Create `router.py`**

  Create `api/exchange-service/router.py`:

  ```python
  from fastapi import APIRouter, Header
  from model import ExchangeOut
  from service import get_exchange

  router = APIRouter()


  @router.get("/exchanges/{from_currency}/{to_currency}", response_model=ExchangeOut)
  def exchange(
      from_currency: str,
      to_currency: str,
      id_account: str = Header(alias="id-account"),
  ):
      return get_exchange(from_currency, to_currency, id_account)
  ```

- [ ] **Step 2: Create `main.py`**

  Create `api/exchange-service/main.py`:

  ```python
  from fastapi import FastAPI
  from router import router

  app = FastAPI()
  app.include_router(router)
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd api/exchange-service
  git add router.py main.py
  git commit -m "add router and main FastAPI app"
  ```

---

## Task 8: `exchange-service` — requirements.txt and Dockerfile

**Files:**
- Create: `api/exchange-service/requirements.txt`
- Create: `api/exchange-service/Dockerfile`

- [ ] **Step 1: Create `requirements.txt`**

  Create `api/exchange-service/requirements.txt`:

  ```
  fastapi
  uvicorn
  requests
  ```

- [ ] **Step 2: Create `Dockerfile`**

  Create `api/exchange-service/Dockerfile`:

  ```dockerfile
  FROM python:3.12-slim
  WORKDIR /app
  COPY requirements.txt .
  RUN pip install --no-cache-dir -r requirements.txt
  COPY . .
  CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
  ```

- [ ] **Step 3: Verify the service starts locally (optional but recommended)**

  ```bash
  cd api/exchange-service
  pip install -r requirements.txt
  uvicorn main:app --port 8080
  ```

  In another terminal:
  ```bash
  curl -s "http://localhost:8080/exchanges/USD/BRL" \
    -H "id-account: test-id" | python3 -m json.tool
  ```

  Expected: JSON with `sell`, `buy`, `date`, `"id-account"` fields.

- [ ] **Step 4: Commit**

  ```bash
  cd api/exchange-service
  git add requirements.txt Dockerfile
  git commit -m "add requirements.txt and Dockerfile"
  ```

---

## Task 9: Gateway — add `/exchanges/**` route

**Files:**
- Modify: `api/gateway-service/src/main/resources/application.yaml`

- [ ] **Step 1: Add the route**

  In `api/gateway-service/src/main/resources/application.yaml`, add the following block after the existing `products` route, before `      metrics:`:

  ```yaml
          - id: exchanges
            uri: http://exchange-service:8080
            predicates:
              - Path=/exchanges/**
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd api/gateway-service
  git add src/main/resources/application.yaml
  git commit -m "add route for exchange-service"
  ```

---

## Task 10: Compose — add `exchange-service`

**Files:**
- Modify: `api/compose.yml`

- [ ] **Step 1: Add the service**

  In `api/compose.yml`, add the following block after the `product` service and before `gateway`:

  ```yaml
    exchange-service:
      build:
        context: ./exchange-service
        dockerfile: Dockerfile
      hostname: exchange-service
      deploy:
        replicas: 1
  ```

- [ ] **Step 2: Commit**

  ```bash
  # from repo root (plataforma/)
  git add api/compose.yml
  git commit -m "add exchange-service to compose"
  ```

---

## Task 11: Plataforma — update submodule pointers

- [ ] **Step 1: Commit updated submodule references**

  ```bash
  # from repo root (plataforma/)
  git add api/exchange api/exchange-service api/gateway-service
  git commit -m "update exchange, exchange-service and gateway-service submodule pointers"
  ```

---

## Smoke Test (manual)

After all tasks are complete:

- [ ] Start the stack: `cd api && docker compose up --build`
- [ ] Get a valid JWT cookie by logging in via the auth service first.
- [ ] Call the exchange endpoint with a valid session cookie:
  ```bash
  curl -s "http://localhost:8080/exchanges/USD/BRL" \
    --cookie "__store_jwt_token=<your-jwt>" | python3 -m json.tool
  ```
  Expected:
  ```json
  {
    "sell": 5.09,
    "buy": 5.08,
    "date": "2026-05-13 10:00:00",
    "id-account": "<your-account-uuid>"
  }
  ```
- [ ] Try a different pair: `http://localhost:8080/exchanges/EUR/BRL`
- [ ] Try without cookie: expected `401 Unauthorized` from gateway.
