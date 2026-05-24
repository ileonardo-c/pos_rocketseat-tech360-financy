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
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCircleArrowDown,
  IconCircleArrowUp,
  IconMail,
  IconTrash,
  IconUserRoundPlus,
} from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { PaginationButton } from "@/components/ui/pagination-button";
import { Select } from "@/components/ui/select";
import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";

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
      <p className="shrink-0 font-jakarta text-2xl font-light leading-snug text-[#121214]">
        {title}
      </p>
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
      <h1 className="font-jakarta text-[40px] font-medium leading-[1.4] text-[#09090a]">
        Componentes
      </h1>

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
              className="inline-flex items-center gap-2 text-sm font-medium text-[#15803d]"
            >
              <IconCircleArrowUp className="h-4 w-4 text-[#16a34a]" />
              Entrada
            </span>
            {/* Saída */}
            <span
              data-testid="type-expense"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#b91c1c]"
            >
              <IconCircleArrowDown className="h-4 w-4 text-[#dc2626]" />
              Saída
            </span>
          </div>
        </div>
      </ComponentSection>
    </main>
  );
};
