# Custos & SLA

!!! warning "Valores estimados"
    Os números abaixo são **estimativas** com base na configuração do cluster
    (`us-east-1`, 2× `t3.medium`, EKS gerenciado, Services `LoadBalancer`) e nos preços
    *on-demand* públicos da AWS. Custos reais variam com tempo de execução, transferência de
    dados e volumes EBS. Para valores exatos, consulte o **AWS Cost Explorer**.

Configuração de referência: cluster definido para `us-east-1`, control plane EKS gerenciado,
nodegroup de 2 nós `t3.medium`, e ELBs gerados pelos Services do tipo `LoadBalancer`
(gateway, Prometheus, Grafana).

---

## Custo por hora (cluster no ar)

| Recurso | Configuração | Preço/h (est.) |
|---|---|---|
| EKS Control Plane | 1 cluster gerenciado | ~$0.10 |
| EC2 NodeGroup | 2× `t3.medium` (on-demand) | ~$0.083 |
| Elastic Load Balancing | 3 ELBs (gateway, Prometheus, Grafana) | ~$0.075 |
| EBS / transferência | volumes + tráfego (variável) | ~$0.01 |
| **Total** | | **~$0.27/h** |

---

## Custo de uma demo

| Item | Valor (est.) |
|---|---|
| Duração típica da apresentação | ~30 min |
| Custo da demo | **~$0.14** |
| Teardown | cluster destruído após a demo (`eksctl delete cluster`) |

!!! tip "Boa prática de custo"
    O cluster é provisionado para a demo e **destruído em seguida** — o custo é proporcional
    ao tempo no ar, não ao tráfego.

---

## Custo se 24/7 (referencial)

| Cenário | Custo/mês (est.) |
|---|---|
| Always-on (2 nós, sem HA extra) | **~$190** |
| Produção com folga de HA (3+ nós) | **~$220–250** |

A maior parcela do custo é **tempo de cluster no ar** (control plane + nós), não o volume de
requisições. Por isso a estratégia de subir/derrubar sob demanda.

---

## SLA esperado (publicado pela AWS)

| Componente | SLA AWS | Observação |
|---|---|---|
| Amazon EKS (control plane) | 99.95% | API do Kubernetes gerenciada |
| Amazon EC2 (nós) | 99.99% | disponibilidade regional |
| Elastic Load Balancing | 99.99% | exposição do gateway |
| PostgreSQL / Redis | — (self-managed) | rodam **in-cluster**; sem SLA gerenciado (ver [PaaS](paas.md)) |

!!! info "SLA composto"
    A disponibilidade efetiva é o produto das camadas. Como PostgreSQL e Redis são
    auto-gerenciados no cluster, eles não herdam um SLA da AWS — é um *trade-off* consciente
    de custo vs. resiliência para o contexto acadêmico.

---

## Otimizações possíveis (não aplicadas)

- **Spot Instances** para os nós — até ~70% de economia, com risco de interrupção.
- **Graviton (`t4g`)** — processadores ARM com melhor custo/desempenho.
- **NLB único / Ingress** em vez de 3 ELBs — consolida a exposição e reduz custo de LB.
- **RDS gerenciado** para o PostgreSQL — ganha SLA e backups, com custo adicional (ver [PaaS](paas.md)).
- **Cluster Autoscaler / Karpenter** — ajusta o número de nós à carga real.
