<h1 align="center">
  <img src=".github/assets/logo.svg" alt="Financy" width="200"/>
</h1>

<p align="center">
  Plataforma full stack de gestão financeira pessoal — controle de receitas, despesas, categorias e dashboard analítico.
</p>

<p align="center">
  <a href="#-tecnologias">Tecnologias</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-funcionalidades">Funcionalidades</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-como-executar">Como Executar</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-testes">Testes</a>&nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="#-licença">Licença</a>
</p>

<p align="center">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green?style=flat-square"/>
  <img alt="Node" src="https://img.shields.io/badge/node-22+-339933?style=flat-square&logo=node.js&logoColor=white"/>
  <img alt="pnpm" src="https://img.shields.io/badge/pnpm-10.5+-F69220?style=flat-square&logo=pnpm&logoColor=white"/>
  <img alt="Docker" src="https://img.shields.io/badge/docker-compose-2496ED?style=flat-square&logo=docker&logoColor=white"/>
</p>

---

## 🚀 Tecnologias

**Backend**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Fastify](https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white)
![GraphQL](https://img.shields.io/badge/GraphQL-E10098?style=flat-square&logo=graphql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=flat-square&logo=amazons3&logoColor=white)

**Frontend**

![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Apollo](https://img.shields.io/badge/Apollo_Client-311C87?style=flat-square&logo=apollographql&logoColor=white)

**Qualidade & CI**

![Biome](https://img.shields.io/badge/Biome-60A5FA?style=flat-square&logo=biome&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=flat-square&logo=githubactions&logoColor=white)

---

## ✨ Funcionalidades

- 🔐 Autenticação completa — cadastro, login e logout com sessão JWT
- 👤 Dados isolados por usuário em todas as operações
- 🗂️ CRUD completo de categorias
- 💸 CRUD completo de transações (receitas e despesas)
- 📊 Dashboard com resumo por período, por categoria e timeline
- 🧾 Upload de comprovantes via URL assinada (AWS S3 / MinIO)
- 🧪 Testes E2E e evidência visual automatizados com Playwright

Fluxo de autenticação:
- cadastro cria a conta e redireciona para `/login` com confirmação;
- somente `login` emite e persiste JWT de sessão.

---

## 🏗️ Arquitetura

```mermaid
  flowchart LR
      A([React + Apollo]) --> B([Fastify + Mercurius])
      B --> C([Prisma])
      C --> D[(PostgreSQL)]
      B --> E([S3 Storage Service])
      E --> F[(MinIO / S3)]
      B --> G([SMTP Client])
      G --> H[(Mailpit / SMTP Provider)]
```

Monorepo gerenciado por workspaces do pnpm:

```text
.
├── backend/     # API GraphQL, Prisma, domínios (auth, category, transaction, storage)
├── frontend/    # App React, páginas protegidas, testes E2E
├── scripts/     # Orquestração E2E e utilitários de ambiente
├── backend/tests # Testes automatizados de API (suítes de backend)
└── .github/     # Workflows de CI, hooks e template de PR
```

---

## 🖥️ Como Executar

### Pré-requisitos

- [Node.js 22+](https://nodejs.org) + [pnpm 10.5+](https://pnpm.io) — `corepack enable`
- [Docker Desktop 24+](https://www.docker.com/products/docker-desktop/)
- Nenhum `.env` é obrigatório para desenvolvimento local; os scripts carregam `.env.example`.

### Desenvolvimento

```bash
# 1. Valide a configuração dos Compose (sem subir serviços)
pnpm dev:check

# 2. Suba o ambiente completo de desenvolvimento (um único comando na raiz)
pnpm dev
```

Uso de `.env` no desenvolvimento:
- `.env.example` é versionado e carregado automaticamente pelos scripts Docker.
- `.env` é opcional e deve ser usado apenas para sobrescrever valores locais.

Artefatos temporários locais:
- qualquer arquivo/script de debug/refatoração manual deve ser criado em `/.tmp-run/manual/`.
- não criar arquivos temporários no root do repositório.

Política de dependências:
- `node_modules` Linux roda apenas em volumes Docker nomeados.
- `node_modules` do host Windows não é compartilhado com os containers.
- `pnpm-lock.yaml` permanece como lockfile único entre host e Docker.

| Serviço | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Style Guide | http://localhost:5173/style-guide |
| Backend / GraphQL | http://localhost:4000/graphql |
| MinIO Console | http://localhost:9001 |

No ambiente de desenvolvimento, o backend executa `prisma migrate deploy` e `prisma db seed` automaticamente no startup do container, deixando a conta de seed padrão e dados iniciais disponíveis antes da primeira execução da aplicação.

Fluxo Prisma:
- `backend/prisma/schema.prisma` define o modelo declarativo.
- `backend/prisma/migrations/**/migration.sql` é gerado pelo Prisma Migrate e deve ser versionado.
- `prisma migrate deploy` aplica o histórico de migrations no banco.
- `prisma db seed` cria o usuário local padrão, categorias e transações iniciais.

Contrato de chamadas do frontend no desenvolvimento:
- o browser usa `/graphql`;
- o Vite faz proxy para `http://backend:4000` na rede Docker.

Para encerrar: `pnpm dev:down`

Fluxo rápido do dia a dia (uso no root do repositório):

```bash
pnpm dev:check          # valida contratos de env/compose
pnpm dev                # sobe API, frontend, postgres, minio e mailpit
pnpm dev:verify:backend # suites de backend (contrato + autenticação)
pnpm dev:verify:journey # jornada e2e preview em Docker
pnpm dev:verify:full    # backend + e2e smoke/contract em Docker + jornada preview
pnpm dev:down           # encerra tudo e limpa volumes nomeados da sessão
pnpm dev:logs           # acompanha logs da stack de desenvolvimento
```

Fluxo E2E Docker-first:

```bash
pnpm e2e:smoke-contract:docker
pnpm e2e:journey:docker
```

Use `pnpm e2e:smoke-contract:docker` como caminho padrão no Docker-first. O comando `pnpm test:e2e:smoke-contract` roda no host e fica reservado para diagnóstico local quando o Playwright já estiver instalado fora do container.

### Produção e deploy

O `docker-compose.yml` deste repositório é exclusivo para desenvolvimento local e CI.
Produção não deve usar os valores de `.env.example`; configure o deploy na plataforma alvo com secrets reais e variáveis equivalentes.

Contrato de chamadas do frontend fora do desenvolvimento:
- o frontend deve usar `VITE_BACKEND_URL` explícita;
- as chamadas seguem `${VITE_BACKEND_URL}/graphql` (sem proxy de desenvolvimento).

Contrato de upload assinado (S3/MinIO):
- `AWS_S3_ENDPOINT_INTERNAL`: endpoint interno da rede Docker/VPC usado pelo backend.
- `AWS_S3_ENDPOINT_PUBLIC`: endpoint público acessível pelo navegador.
- `S3_PUBLIC_ORIGIN_HOSTS`: lista CSV de hosts que devem receber URL assinada com `AWS_S3_ENDPOINT_PUBLIC`.
- Para hosts fora da lista, o backend assina com `AWS_S3_ENDPOINT_INTERNAL`.
- A rede Docker usa alias interno `s3.internal` para o serviço de storage.
- Em ECS/ECR, configure os mesmos nomes de env na Task Definition (sem fallback de código).

Observação de infraestrutura:
- os comandos Docker usam projetos isolados: `financy-dev` no desenvolvimento e `financy-ci-<suite>` no CI.
- o ambiente Docker usa store dedicado via `PNPM_STORE_DIR=/pnpm/store`.

---

## 🧪 Testes

### E2E (Playwright)

Os testes E2E rodam em um container dedicado com Chromium pré-instalado e seguem uma taxonomia única por intenção:

- `smoke`: contrato mínimo funcional e proteção de rota.
- `contract`: validações essenciais de carregamento sem erros globais falsos.
- `journey`: fluxo completo com bootstrap de dados.
- `transition`: estabilidade de animações de navegação.

Para execução E2E fora do Docker, o runner da raiz carrega `.env.example` automaticamente.
Use `.env` apenas quando precisar sobrescrever valores locais.
Comandos principais no root:

```bash
pnpm e2e:smoke-contract:docker
pnpm e2e:smoke
pnpm test:e2e:smoke
pnpm e2e:contract
pnpm e2e:journey
pnpm e2e:transition
pnpm test:e2e:smoke-contract
```
Use `pnpm e2e:smoke-contract:docker` e `pnpm e2e:journey:docker` no fluxo Docker-first.
O comando `pnpm test:e2e:smoke-contract` roda no host e fica reservado para diagnóstico local quando o Playwright já estiver instalado fora do container.
Para rodar apenas o smoke de login a partir da raiz, use `pnpm e2e:smoke` ou o alias `pnpm test:e2e:smoke`; ambos usam o runner da raiz para carregar `.env.example` antes de chamar o pacote `@financy/frontend`.

## Conta seed para QA e desenvolvimento

Essas credenciais são usadas como conta padrão em ambiente local:

- Nome: `Financy Admin`
- E-mail: `admin@financy.local`
- Senha: `TestAdmin123!`

Elas são usadas pelo `prisma db seed` no startup de desenvolvimento e por `e2e-bootstrap` como base da jornada.
O seed também cria categorias e transações locais para que o dashboard abra com dados úteis em um banco limpo.
Essa conta é apenas para ambiente local/QA e não representa usuário de produção.

## Recuperação de acesso por e-mail (OTP)

O fluxo de recuperação usa o endereço de e-mail cadastrado na conta para solicitar o código:

- Em `/login`, clique em `Recuperar senha`.
- Em `/forgot-password` (etapa 1), informe o **e-mail de cadastro**.
- Verifique o código recebido no e-mail configurado no backend (`SMTP_*`) e valide com a etapa de nova senha.
- O e-mail pode ser visualizado no SMTP local (`mailpit`) quando rodando em `development`.

### Testes de API (backend)

```bash
pnpm prisma:generate
pnpm test:backend
pnpm test:backend:api-contract
pnpm test:backend:graphql-security
pnpm test:backend:auth-service
pnpm test:backend:password-reset-service
pnpm test:backend:transaction-service
pnpm test:backend:auth-regression
pnpm smoke:graphql    # diagnóstico local
pnpm smoke:auth       # diagnóstico local
```

`pnpm smoke:graphql` e `pnpm smoke:auth` são utilitários de diagnóstico para contratos GraphQL e autenticação. Eles exigem o backend disponível em `http://127.0.0.1:4000/graphql`; no fluxo local recomendado, suba a stack com `pnpm dev` antes de executá-los.

Os relatórios E2E ficam em `frontend/playwright-report` após a execução.

---

## 🧭 Governança

- Licença: [MIT](LICENSE)
- Template de PR: [`.github/pull_request_template.md`](.github/pull_request_template.md)
- Revisões e aprovação: [`.github/CODEOWNERS`](.github/CODEOWNERS)
- Convenções de branch e contribuição: [CONTRIBUTING.md](CONTRIBUTING.md)
