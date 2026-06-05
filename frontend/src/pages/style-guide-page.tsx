/**
 * Style Guide page — pixel-perfect implementation of Figma node 1085-814.
 *
 * Layout: white container, p-80px, gap-72px.
 * Each section: title (Plus Jakarta Sans Light 24px #121214) + Detalhamento row.
 * Detalhamento: coluna esquerda 200px (Martian Mono Regular 14px #7C7C8A, wdth 100)
 *               coluna direita flex-1 (componentes).
 */
import type { ReactNode } from "react";

import {
  IconBriefcaseBusiness,
  IconCarFront,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCircleArrowDown,
  IconCircleArrowUp,
  IconMail,
  IconPlus,
  IconSearch,
  IconSquarePen,
  IconTrash,
  IconUserRoundPlus,
  IconUtensils,
  IconWallet,
} from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CategoryRow } from "@/components/ui/category-row";
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardNav } from "@/components/ui/dashboard-nav";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { PageHeading } from "@/components/ui/page-heading";
import { PaginationButton } from "@/components/ui/pagination-button";
import { SectionShell } from "@/components/ui/section-shell";
import { Select } from "@/components/ui/select";
import { SummaryCard } from "@/components/ui/summary-card";
import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { TransactionRow } from "@/components/ui/transaction-row";

/* ─────────────────────────────────────────────────────────────────────────── */
/* Layout primitives                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

/** Wrapper de seção: título leve + área de detalhamento */
function ComponentSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex w-full flex-col gap-6"
      data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      {/* Figma: Plus Jakarta Sans Light 24px #121214 */}
      <p className="shrink-0 text-2xl font-light leading-snug text-financy-text">{title}</p>
      {children}
    </div>
  );
}

/**
 * Linha de detalhamento: coluna de labels Martian Mono + coluna de componentes.
 * @param labels    — textos da coluna esquerda, distribuídos verticalmente
 * @param padBottom — padding bottom override (Figma Input usa 160px)
 */
function DetailRow({
  labels,
  padBottom,
  children,
}: {
  labels: string[];
  padBottom?: string;
  children: ReactNode;
}) {
  const topPad = "64px";
  const botPad = padBottom ?? "64px";

  return (
    <div className="flex w-full items-stretch">
      {/* Left column — Figma: Martian Mono Regular 14px #7C7C8A wdth 100, w-200px */}
      <div
        className="flex w-[200px] shrink-0 flex-col gap-10 font-mono-martian text-[14px] font-normal leading-normal text-[#7c7c8a]"
        style={{
          paddingTop: topPad,
          paddingBottom: botPad,
          fontVariationSettings: "'wdth' 100",
        }}
      >
        {labels.map((label) => (
          <div key={label} className="flex flex-1 flex-col justify-center">
            <p>{label}</p>
          </div>
        ))}
      </div>

      {/* Right column — componentes */}
      <div
        className="flex flex-1 flex-col gap-10"
        style={{ paddingTop: topPad, paddingBottom: botPad }}
      >
        {children}
      </div>
    </div>
  );
}

/** Célula de linha (alinha verticalmente com o label correspondente) */
function Cell({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col justify-center">{children}</div>;
}

/* ─────────────────────────────────────────────────────────────────────────── */
/* Page                                                                        */
/* ─────────────────────────────────────────────────────────────────────────── */

export const StyleGuidePage = () => {
  return (
    <main
      className="flex w-full flex-col gap-[72px] rounded-[20px] bg-white p-[80px]"
      data-testid="style-guide-page"
      data-node-id="1085:814"
    >
      {/* ── Título principal ─────────────────────────────────────────────── */}
      {/* Figma: Plus Jakarta Sans Medium 40px #09090A */}
      <h1 className="text-[40px] font-medium leading-[1.4] text-financy-heading">Componentes</h1>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Input                                                               */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Input">
        {/* Figma: padTop 64px padBottom 160px */}
        <DetailRow
          labels={["Empty", "Active", "Filled", "Error", "Disabled", "Select"]}
          padBottom="160px"
        >
          {/* Empty */}
          <Cell>
            <Input
              data-testid="input-empty"
              state="empty"
              label="Label"
              placeholder="Placeholder"
              helper="Helper"
              startIcon={<IconMail className="h-4 w-4" />}
            />
          </Cell>

          {/* Active */}
          <Cell>
            <Input
              data-testid="input-active"
              state="active"
              label="Label"
              defaultValue="Text"
              helper="Helper"
              startIcon={<IconMail className="h-4 w-4" />}
              readOnly
            />
          </Cell>

          {/* Filled */}
          <Cell>
            <Input
              data-testid="input-filled"
              state="filled"
              label="Label"
              defaultValue="Text"
              helper="Helper"
              startIcon={<IconMail className="h-4 w-4" />}
              readOnly
            />
          </Cell>

          {/* Error */}
          <Cell>
            <Input
              data-testid="input-error"
              state="error"
              label="Label"
              defaultValue="Text"
              helper="Helper"
              helperError
              startIcon={<IconMail className="h-4 w-4" />}
              readOnly
            />
          </Cell>

          {/* Disabled */}
          <Cell>
            <Input
              data-testid="input-disabled"
              state="disabled"
              label="Label"
              defaultValue="Text"
              helper="Helper"
              startIcon={<IconMail className="h-4 w-4" />}
              readOnly
            />
          </Cell>

          {/* Select — mostra como input com chevron direito */}
          <Cell>
            <Input
              data-testid="input-select"
              state="filled"
              label="Label"
              defaultValue="Option 1"
              helper="Helper"
              startIcon={<IconMail className="h-4 w-4" />}
              endIcon={<IconChevronDown className="h-4 w-4 cursor-pointer" />}
              readOnly
            />
          </Cell>
        </DetailRow>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Checkbox */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Checkbox">
        <DetailRow labels={["Default", "Checked", "Disabled"]}>
          <Cell>
            <Checkbox
              data-testid="checkbox-default"
              label="Lembrar-me"
              onChange={() => {}}
              state="default"
            />
          </Cell>
          <Cell>
            <Checkbox
              data-testid="checkbox-checked"
              checked
              label="Lembrar-me"
              onChange={() => {}}
              state="checked"
            />
          </Cell>
          <Cell>
            <Checkbox
              data-testid="checkbox-disabled"
              disabled
              label="Lembrar-me"
              onChange={() => {}}
              state="disabled"
            />
          </Cell>
        </DetailRow>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Label Button                                                        */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Label Button">
        <DetailRow
          labels={[
            "Md / Default",
            "Md / Hover",
            "Md / Disabled",
            "Sm / Default",
            "Sm / Hover",
            "Sm / Disabled",
          ]}
        >
          <Cell>
            <div className="flex gap-2" data-testid="btn-md-default">
              <Button size="md" variant="primary">
                Label
              </Button>
              <Button size="md" variant="outline">
                Label
              </Button>
            </div>
          </Cell>
          <Cell>
            <div className="flex gap-2" data-testid="btn-md-hover">
              <Button size="md" variant="primary" state="hover">
                Label
              </Button>
              <Button size="md" variant="outline" state="hover">
                Label
              </Button>
            </div>
          </Cell>
          <Cell>
            <div className="flex gap-2" data-testid="btn-md-disabled">
              <Button size="md" variant="primary" state="disabled">
                Label
              </Button>
              <Button size="md" variant="outline" state="disabled">
                Label
              </Button>
            </div>
          </Cell>
          <Cell>
            <div className="flex gap-2" data-testid="btn-sm-default">
              <Button size="sm" variant="primary">
                Label
              </Button>
              <Button size="sm" variant="outline">
                Label
              </Button>
            </div>
          </Cell>
          <Cell>
            <div className="flex gap-2" data-testid="btn-sm-hover">
              <Button size="sm" variant="primary" state="hover">
                Label
              </Button>
              <Button size="sm" variant="outline" state="hover">
                Label
              </Button>
            </div>
          </Cell>
          <Cell>
            <div className="flex gap-2" data-testid="btn-sm-disabled">
              <Button size="sm" variant="primary" state="disabled">
                Label
              </Button>
              <Button size="sm" variant="outline" state="disabled">
                Label
              </Button>
            </div>
          </Cell>
        </DetailRow>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Icon Button                                                         */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Icon Button">
        <DetailRow labels={["Default", "Hover", "Disabled"]}>
          <Cell>
            <div className="flex gap-2" data-testid="icon-btn-default">
              <IconButton variant="outline" aria-label="Add user" onClick={() => {}}>
                <IconUserRoundPlus className="h-4 w-4" />
              </IconButton>
              <IconButton variant="danger" aria-label="Delete" onClick={() => {}}>
                <IconTrash className="h-4 w-4" />
              </IconButton>
            </div>
          </Cell>
          <Cell>
            <div className="flex gap-2" data-testid="icon-btn-hover">
              <IconButton variant="outline" state="hover" aria-label="Add user">
                <IconUserRoundPlus className="h-4 w-4" />
              </IconButton>
              <IconButton variant="danger" state="hover" aria-label="Delete">
                <IconTrash className="h-4 w-4" />
              </IconButton>
            </div>
          </Cell>
          <Cell>
            <div className="flex gap-2" data-testid="icon-btn-disabled">
              <IconButton variant="outline" state="disabled" aria-label="Add user">
                <IconUserRoundPlus className="h-4 w-4" />
              </IconButton>
              <IconButton variant="danger" state="disabled" aria-label="Delete">
                <IconTrash className="h-4 w-4" />
              </IconButton>
            </div>
          </Cell>
        </DetailRow>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Link                                                                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Link">
        <DetailRow labels={["Default", "Hover"]}>
          <Cell>
            <TextLink
              data-testid="link-default"
              href="#"
              leftIcon={<IconChevronLeft className="h-3 w-3" />}
            >
              Label
            </TextLink>
          </Cell>
          <Cell>
            <TextLink
              data-testid="link-hover"
              href="#"
              state="hover"
              rightIcon={<IconChevronRight className="h-3 w-3" />}
            >
              Label
            </TextLink>
          </Cell>
        </DetailRow>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Pagination Button                                                   */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Pagination Button">
        <DetailRow labels={["Default", "Hover", "Active", "Disabled"]}>
          <div className="flex flex-1 items-center">
            <PaginationButton
              data-testid="pag-default"
              label="1"
              state="default"
              onClick={() => {}}
            />
          </div>
          <div className="flex flex-1 items-center">
            <PaginationButton data-testid="pag-hover" label="1" state="hover" />
          </div>
          <div className="flex flex-1 items-center">
            <PaginationButton
              data-testid="pag-active"
              label="1"
              state="active"
              onClick={() => {}}
            />
          </div>
          <div className="flex flex-1 items-center">
            <PaginationButton data-testid="pag-disabled" label="1" state="disabled" />
          </div>
        </DetailRow>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Select                                                              */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Select">
        <DetailRow labels={["Default"]}>
          <Cell>
            {/* Interactive select — anchors E2E tests for open/close/keyboard */}
            <div className="max-w-xs">
              <Select data-testid="select-demo" defaultValue="option-1">
                <option value="option-1">Option 1</option>
                <option value="option-2">Option 2</option>
                <option value="option-3">Option 3</option>
              </Select>
            </div>
          </Cell>
        </DetailRow>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Dashboard                                                           */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Dashboard">
        <div className="flex w-full items-start">
          <div className="w-[200px] shrink-0" />
          <div className="flex flex-1 flex-col gap-6 py-[64px]">
            <Card className="overflow-hidden border-financy-border p-0">
              <DashboardNav currentPath="/" userInitials="AF" />
            </Card>

            <div className="grid gap-6 xl:grid-cols-3">
              <SummaryCard
                icon={<IconWallet className="h-5 w-5 text-[#9333ea]" />}
                label="Saldo total"
                value="R$ 12.847,32"
              />
              <SummaryCard
                icon={<IconCircleArrowUp className="h-5 w-5 text-financy-success" />}
                label="Receitas do mês"
                value="R$ 2.840,25"
              />
              <SummaryCard
                icon={<IconCircleArrowDown className="h-5 w-5 text-financy-danger" />}
                label="Despesas do mês"
                value="R$ 1.192,55"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-[781.333px_378.667px]">
              <SectionShell
                title="Transações recentes"
                bodyElement="ul"
                bodySpacing="none"
                linkLabel="Ver todas"
                linkTo="/transactions?from=2025-11-01&to=2025-11-30"
                footerLabel="Nova transação"
                footerIcon={<IconPlus className="h-5 w-5" />}
                footerOnClick={() => {}}
              >
                <TransactionRow
                  title="Jantar no restaurante"
                  date="30/11/2025"
                  categoryLabel="Alimentação"
                  categoryVariant="blue"
                  type="EXPENSE"
                  amountLabel="- R$ 89,50"
                  leadingIcon={<IconUtensils className="h-4 w-4 text-financy-tag-blue-text" />}
                  leadingIconBgClassName="bg-financy-tag-blue-bg"
                />
                <TransactionRow
                  title="Posto de Gasolina"
                  date="29/11/2025"
                  categoryLabel="Transporte"
                  categoryVariant="purple"
                  type="EXPENSE"
                  amountLabel="- R$ 100,00"
                  leadingIcon={<IconCarFront className="h-4 w-4 text-financy-tag-purple-text" />}
                  leadingIconBgClassName="bg-financy-tag-purple-bg"
                />
                <TransactionRow
                  title="Freelance"
                  date="24/11/2025"
                  categoryLabel="Salário"
                  categoryVariant="green"
                  type="INCOME"
                  amountLabel="+ R$ 2.500,00"
                  leadingIcon={
                    <IconBriefcaseBusiness className="h-4 w-4 text-financy-tag-green-text" />
                  }
                  leadingIconBgClassName="bg-financy-tag-green-bg"
                />
              </SectionShell>

              <SectionShell
                title="Categorias"
                bodyElement="ul"
                bodySpacing="comfortable"
                linkLabel="Gerenciar"
                linkTo="/categories"
              >
                <CategoryRow
                  label="Alimentação"
                  itemsLabel="4 itens"
                  totalLabel="R$ 348,30"
                  variant="blue"
                />
                <CategoryRow
                  label="Transporte"
                  itemsLabel="3 itens"
                  totalLabel="R$ 205,90"
                  variant="purple"
                />
                <CategoryRow
                  label="Mercado"
                  itemsLabel="2 itens"
                  totalLabel="R$ 156,80"
                  variant="orange"
                />
              </SectionShell>
            </div>
          </div>
        </div>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Transactions                                                     */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Transactions">
        <div className="flex w-full items-start">
          <div className="w-[200px] shrink-0" />
          <div className="flex flex-1 flex-col gap-6 py-[64px]">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <PageHeading
                title="Transações"
                description="Gerencie todas as suas transações financeiras"
              />
              <Button size="sm" variant="primary" startIcon={<IconPlus className="h-4 w-4" />}>
                Nova transação
              </Button>
            </header>

            <Card className="border-financy-border p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Input
                  label="Buscar"
                  type="text"
                  placeholder="Buscar por descrição"
                  startIcon={<IconSearch className="h-4 w-4" />}
                />
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="style-guide-transactions-type"
                    className="text-sm font-medium leading-5 text-financy-text-secondary"
                  >
                    Tipo
                  </label>
                  <Select id="style-guide-transactions-type" defaultValue="ALL">
                    <option value="ALL">Todos</option>
                    <option value="INCOME">Receitas</option>
                    <option value="EXPENSE">Despesas</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="style-guide-transactions-category"
                    className="text-sm font-medium leading-5 text-financy-text-secondary"
                  >
                    Categoria
                  </label>
                  <Select id="style-guide-transactions-category" defaultValue="">
                    <option value="">Todas</option>
                    <option value="food">Alimentação</option>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="style-guide-transactions-period"
                    className="text-sm font-medium leading-5 text-financy-text-secondary"
                  >
                    Período
                  </label>
                  <Select id="style-guide-transactions-period" defaultValue="2025-11">
                    <option value="2025-11">Novembro / 2025</option>
                  </Select>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden border-financy-border">
              <div className="hidden w-full items-center border-b border-financy-border sm:flex">
                <div className="flex-1 px-6 py-5 text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                  Descrição
                </div>
                <div className="w-[112px] px-6 py-5 text-center text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                  Data
                </div>
                <div className="w-[200px] px-6 py-5 text-center text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                  Categoria
                </div>
                <div className="w-[136px] px-6 py-5 text-center text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                  Tipo
                </div>
                <div className="w-[200px] px-6 py-5 text-right text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                  Valor
                </div>
                <div className="w-[120px] px-6 py-5 text-center text-[12px] font-medium uppercase tracking-[0.6px] text-financy-muted">
                  Ações
                </div>
              </div>
              <ul className="m-0 flex list-none flex-col p-0">
                <TransactionRow
                  variant="table"
                  title="Jantar no restaurante"
                  date="30/11/2025"
                  categoryLabel="Alimentação"
                  categoryVariant="blue"
                  type="EXPENSE"
                  amountLabel="- R$ 89,50"
                  actions={
                    <>
                      <IconButton variant="danger" aria-label="Excluir transação">
                        <IconTrash className="h-4 w-4" />
                      </IconButton>
                      <IconButton aria-label="Editar transação">
                        <IconSquarePen className="h-4 w-4" />
                      </IconButton>
                    </>
                  }
                />
              </ul>
            </Card>
          </div>
        </div>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Tag                                                                 */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Tag">
        {/* Figma: no labels na coluna esquerda, direto no flex */}
        <div className="flex w-full items-start">
          <div className="w-[200px] shrink-0" />
          <div className="flex flex-1 flex-col gap-4 py-[64px]" data-testid="tag-section">
            {/* Row 1: Gray Blue Purple Pink */}
            <div className="flex flex-wrap gap-2">
              <Tag data-testid="tag-gray" category="gray" onClick={() => {}}>
                Label
              </Tag>
              <Tag data-testid="tag-blue" category="blue" onClick={() => {}}>
                Label
              </Tag>
              <Tag data-testid="tag-purple" category="purple" onClick={() => {}}>
                Label
              </Tag>
              <Tag data-testid="tag-pink" category="pink" onClick={() => {}}>
                Label
              </Tag>
            </div>
            {/* Row 2: Red Orange Yellow Green */}
            <div className="flex flex-wrap gap-2">
              <Tag data-testid="tag-red" category="red" onClick={() => {}}>
                Label
              </Tag>
              <Tag data-testid="tag-orange" category="orange" onClick={() => {}}>
                Label
              </Tag>
              <Tag data-testid="tag-yellow" category="yellow" onClick={() => {}}>
                Label
              </Tag>
              <Tag data-testid="tag-green" category="green" onClick={() => {}}>
                Label
              </Tag>
            </div>
          </div>
        </div>
      </ComponentSection>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {/* Type                                                                */}
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <ComponentSection title="Type">
        <div className="flex w-full items-start">
          <div className="w-[200px] shrink-0" />
          <div className="flex flex-1 flex-col gap-4 py-[64px]" data-testid="type-section">
            {/* Entrada */}
            <span
              data-testid="type-income"
              className="inline-flex items-center gap-2 text-sm font-medium text-financy-success"
            >
              <IconCircleArrowUp className="h-4 w-4" />
              Entrada
            </span>
            {/* Saída */}
            <span
              data-testid="type-expense"
              className="inline-flex items-center gap-2 text-sm font-medium text-financy-danger"
            >
              <IconCircleArrowDown className="h-4 w-4" />
              Saída
            </span>
          </div>
        </div>
      </ComponentSection>
    </main>
  );
};
