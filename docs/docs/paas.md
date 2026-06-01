# PaaS

## O que é PaaS no nosso contexto

Em vez de provisionar máquinas manualmente e gerenciar sistema operacional, patches e
disponibilidade (modelo **IaaS**), a plataforma se apoia em **serviços gerenciados (PaaS/CaaS)**
para as responsabilidades que não agregam valor ao produto: control plane do Kubernetes,
registro de imagens e hospedagem da documentação.

A regra adotada: **terceirizar a operação onde o ganho pedagógico/produtivo justifica**, e
**manter sob nosso controle** o que o curso exige aprender a operar (Kubernetes, HPA, manifests).

---

## Tecnologias PaaS utilizadas

| Tecnologia | Classificação | O que a AWS/provedor gerencia |
|---|---|---|
| **Amazon EKS** | PaaS / CaaS | control plane do Kubernetes, patches, resiliência multi-AZ |
| **Docker Hub** | PaaS (registry) | armazenamento e distribuição das imagens (multi-arch) |
| **GitHub Pages** | PaaS (hosting) | hospedagem estática da documentação, HTTPS e CDN automáticos |

---

## Componentes self-managed (não-PaaS)

| Componente | Por que não terceirizamos |
|---|---|
| **PostgreSQL** | roda in-cluster — exigência de operar o banco e economizar vs. RDS |
| **Redis** | cache in-cluster, próximo dos serviços |
| **Jenkins** | servidor de CI próprio, para exercitar a pipeline ponta a ponta |

!!! info "Trade-off"
    Manter PostgreSQL, Redis e Jenkins sob nosso controle aumenta o custo operacional e
    abre mão de SLAs gerenciados, mas é intencional: o objetivo da disciplina é **operar**
    esses componentes, não apenas consumi-los.

---

## Por que esse modelo

- **Foco no produto:** o time gasta tempo nos microsserviços, não em manter um control plane do Kubernetes.
- **Alinhamento ao curso:** EKS dá acesso real a manifests, HPA e isolamento por namespace/serviço.
- **Resiliência herdada:** EKS e ELB trazem SLA da AWS (ver [Custos & SLA](custos.md)).
- **Custo previsível:** proporcional ao tempo de cluster no ar.

---

## Comparativo: por que não outras opções

| Alternativa | Custo aprox. | Por que não |
|---|---|---|
| Heroku | médio-alto | abstrai demais Kubernetes; foge do objetivo de manifests/HPA |
| Render / Fly.io | baixo-médio | bom DX, mas sem exposição real a Kubernetes gerenciado |
| EC2 puro (IaaS) | baixo | exigiria operar o control plane do K8s manualmente |
| **EKS + Docker Hub** | ~$190/mês (24/7) | **escolhido** — Kubernetes gerenciado com HPA, manifests e SLA |

---

## Resumo técnico

| Camada | Tecnologia | Modelo | Gerenciado por |
|---|---|---|---|
| Orquestração | Amazon EKS | PaaS/CaaS | AWS |
| Compute | EC2 (t3.medium) | IaaS | AWS (infra) / nós (nós) |
| Exposição | Elastic Load Balancing | PaaS | AWS |
| Registry | Docker Hub | PaaS | Docker |
| Docs | GitHub Pages | PaaS | GitHub |
| Banco / Cache | PostgreSQL · Redis | self-managed | Grupo |
| CI/CD | Jenkins | self-managed | Grupo |
