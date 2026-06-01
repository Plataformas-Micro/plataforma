# AWS

A plataforma é executada inteiramente na **AWS**, na região **us-east-1**, apoiando-se em serviços gerenciados para reduzir o esforço operacional. Os microsserviços (Java 25 / Spring Boot 4.0.3 e um serviço Python 3.12) rodam sobre o **Amazon EKS**.

## Serviços AWS utilizados

| Serviço | Uso |
|---|---|
| **Amazon EKS** | Cluster Kubernetes gerenciado que hospeda todos os microsserviços. |
| **Amazon EC2** | Nós do nodegroup do cluster (instâncias `t3.medium`). |
| **Elastic Load Balancing (ELB)** | Exposição do gateway, do Prometheus e do Grafana via `Service` do tipo `LoadBalancer`. |
| **IAM** | Credenciais de deploy utilizadas pela pipeline de CI/CD. |

## Credenciais IAM

O acesso da pipeline ao cluster é feito por um **usuário IAM de longa duração**, sem rotação automática de tokens de sessão.

!!! info "Credenciais permanentes"
    Utiliza-se um par de chaves IAM de longa duração — `aws-access-key-id` + `aws-secret-access-key` — **sem token de sessão**. As chaves ficam armazenadas como *secrets* no Jenkins e são consumidas pelo comando `aws eks update-kubeconfig` durante o deploy, para autenticar contra o cluster EKS.

| Credencial | Variável |
|---|---|
| `aws-access-key-id` | `AWS_ACCESS_KEY_ID` |
| `aws-secret-access-key` | `AWS_SECRET_ACCESS_KEY` |

!!! warning "Boas práticas"
    Recomenda-se que o usuário IAM siga o princípio de **menor privilégio**, com uma policy restrita apenas às ações necessárias para o deploy (ex.: `eks:DescribeCluster`), e que as chaves sejam **rotacionadas** periodicamente.

Os detalhes de como essas credenciais são injetadas na pipeline estão em [CI/CD](cicd.md).

## Região e custos

A região **us-east-1** foi escolhida por concentrar o maior catálogo de serviços e os menores custos de referência da AWS. Veja [Custos & SLA](../custos.md) e [PaaS](../paas.md).

## Provisionamento do cluster

O cluster EKS é criado com `eksctl`; veja [EKS](eks.md).
