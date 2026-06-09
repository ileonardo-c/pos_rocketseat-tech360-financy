import type { ComponentType, ReactNode, SVGProps } from "react";

import logoMarkUrl from "@/assets/brand/logo-mark.svg";
import {
  IconArrowUpDown,
  IconBaggageClaim,
  IconBookOpen,
  IconBriefcaseBusiness,
  IconCarFront,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCircleArrowDown,
  IconCircleArrowUp,
  IconDumbbell,
  IconEyeClosed,
  IconGift,
  IconHeartPulse,
  IconHouse,
  IconLock,
  IconLogIn,
  IconLogOut,
  IconMail,
  IconMailbox,
  IconPawPrint,
  IconPiggyBank,
  IconPlus,
  IconReceiptText,
  IconSearch,
  IconShoppingCart,
  IconSquarePen,
  IconTag,
  IconTicket,
  IconToolCase,
  IconTrash,
  IconUserRound,
  IconUserRoundOutline,
  IconUserRoundPlus,
  IconUtensils,
  IconWallet,
} from "@/assets/icons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { PaginationButton } from "@/components/ui/pagination-button";
import { Select } from "@/components/ui/select";
import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const tokenColors = [
  { name: "Primary", value: "#1F6F43", className: "bg-financy-primary" },
  { name: "Primary hover", value: "#124B2B", className: "bg-financy-primary-hover" },
  { name: "Heading", value: "#09090A", className: "bg-financy-heading" },
  { name: "Text", value: "#121214", className: "bg-financy-text" },
  { name: "Muted", value: "#6B7280", className: "bg-financy-muted" },
  { name: "Border", value: "#D1D5DB", className: "bg-financy-border" },
  { name: "Success", value: "#16A34A", className: "bg-financy-success" },
  { name: "Danger", value: "#DC2626", className: "bg-financy-danger" },
];

const iconGroups: Array<{
  title: string;
  icons: Array<{ name: string; Icon: IconComponent }>;
}> = [
  {
    title: "Navegação",
    icons: [
      { name: "chevron-left", Icon: IconChevronLeft },
      { name: "chevron-right", Icon: IconChevronRight },
      { name: "chevron-down", Icon: IconChevronDown },
      { name: "arrow-up-down", Icon: IconArrowUpDown },
      { name: "log-in", Icon: IconLogIn },
      { name: "log-out", Icon: IconLogOut },
    ],
  },
  {
    title: "Ações",
    icons: [
      { name: "plus", Icon: IconPlus },
      { name: "search", Icon: IconSearch },
      { name: "trash", Icon: IconTrash },
      { name: "square-pen", Icon: IconSquarePen },
      { name: "check", Icon: IconCheck },
      { name: "tag", Icon: IconTag },
      { name: "eye-closed", Icon: IconEyeClosed },
    ],
  },
  {
    title: "Formulário",
    icons: [
      { name: "mail", Icon: IconMail },
      { name: "lock", Icon: IconLock },
      { name: "user-round", Icon: IconUserRound },
      { name: "user-round-outline", Icon: IconUserRoundOutline },
      { name: "user-round-plus", Icon: IconUserRoundPlus },
      { name: "mailbox", Icon: IconMailbox },
    ],
  },
  {
    title: "Financeiro",
    icons: [
      { name: "wallet", Icon: IconWallet },
      { name: "circle-arrow-up", Icon: IconCircleArrowUp },
      { name: "circle-arrow-down", Icon: IconCircleArrowDown },
      { name: "receipt-text", Icon: IconReceiptText },
      { name: "piggy-bank", Icon: IconPiggyBank },
      { name: "shopping-cart", Icon: IconShoppingCart },
      { name: "ticket", Icon: IconTicket },
    ],
  },
  {
    title: "Categorias",
    icons: [
      { name: "briefcase-business", Icon: IconBriefcaseBusiness },
      { name: "utensils", Icon: IconUtensils },
      { name: "car-front", Icon: IconCarFront },
      { name: "heart-pulse", Icon: IconHeartPulse },
      { name: "tool-case", Icon: IconToolCase },
      { name: "paw-print", Icon: IconPawPrint },
      { name: "house", Icon: IconHouse },
      { name: "gift", Icon: IconGift },
      { name: "dumbbell", Icon: IconDumbbell },
      { name: "book-open", Icon: IconBookOpen },
      { name: "baggage-claim", Icon: IconBaggageClaim },
    ],
  },
];

const tagCategories = [
  "gray",
  "blue",
  "purple",
  "pink",
  "red",
  "orange",
  "yellow",
  "green",
] as const;

function ComponentSection({
  title,
  testId,
  children,
}: {
  title: string;
  testId: string;
  children: ReactNode;
}) {
  return (
    <section className="flex w-full flex-col gap-6" data-testid={testId}>
      <h2 className="text-2xl font-light leading-snug text-financy-text">{title}</h2>
      {children}
    </section>
  );
}

function DetailGrid({
  labels,
  children,
}: {
  labels: string[];
  children: ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <div className="hidden flex-col gap-10 py-16 font-mono-martian text-sm text-[#7c7c8a] lg:flex">
        {labels.map((label) => (
          <span key={label} className="flex min-h-12 items-center">
            {label}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 flex-col gap-10 py-4 lg:py-16">{children}</div>
    </div>
  );
}

function Swatch({
  name,
  value,
  className,
}: {
  name: string;
  value: string;
  className: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-financy-border bg-white p-3">
      <span className={`h-10 w-10 rounded-lg border border-black/5 ${className}`} />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-financy-text">{name}</span>
        <span className="block font-mono-martian text-xs text-financy-muted">{value}</span>
      </span>
    </div>
  );
}

function IconTile({ name, Icon }: { name: string; Icon: IconComponent }) {
  return (
    <div
      className="flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-lg border border-financy-border bg-white p-3 text-center"
      data-testid={`style-guide-icon-${name}`}
    >
      <Icon className="h-5 w-5 text-financy-text-secondary" />
      <span className="max-w-full break-words font-mono-martian text-[11px] leading-4 text-financy-muted">
        {name}
      </span>
    </div>
  );
}

function SelectField({
  label,
  state,
  testId,
}: {
  label: string;
  state: "default" | "focus" | "open" | "active" | "disabled" | "error" | "valid";
  testId: string;
}) {
  const isDisabled = state === "disabled";
  const isError = state === "error";
  const isFocused = state === "focus" || state === "open" || state === "valid";

  return (
    <div className="flex flex-col gap-2" data-testid={testId}>
      <span className="text-sm font-medium text-financy-text-secondary">{label}</span>
      <div
        className={[
          "relative flex min-h-12 items-center justify-between rounded-lg border bg-white px-[13px] py-[15px] text-base leading-[18px]",
          isFocused ? "border-financy-primary ring-4 ring-financy-primary/10" : "",
          isError ? "border-financy-danger ring-4 ring-financy-danger/20" : "",
          isDisabled
            ? "border-financy-field-border bg-financy-disabled text-financy-text-subtle opacity-60"
            : "",
          !isFocused && !isError && !isDisabled
            ? "border-financy-field-border text-financy-field-text"
            : "",
        ].join(" ")}
      >
        <span>{state === "active" ? "Option 2" : "Option 1"}</span>
        <IconChevronDown
          className={[
            "h-[5.333px] w-[9.333px] text-financy-field-placeholder",
            state === "open" ? "rotate-180" : "",
          ].join(" ")}
        />
        {state === "open" ? (
          <div
            className="absolute left-0 top-[calc(100%+8px)] z-10 w-full rounded-lg border border-financy-border bg-white p-1 shadow-lg"
            data-testid="style-guide-select-static-menu"
          >
            <div className="rounded-md bg-financy-surface-soft px-3 py-2 text-sm font-semibold text-financy-text">
              Option 1
            </div>
            <div className="px-3 py-2 text-sm text-financy-text">Option 2</div>
            <div className="px-3 py-2 text-sm text-financy-text-subtle">Disabled option</div>
          </div>
        ) : null}
      </div>
      {isError ? <span className="text-xs text-financy-danger">Mensagem de erro</span> : null}
      {state === "valid" ? (
        <span className="text-xs text-financy-success">Campo validado</span>
      ) : null}
    </div>
  );
}

export const StyleGuidePage = () => {
  const iconCount = iconGroups.reduce((total, group) => total + group.icons.length, 0);

  return (
    <main
      className="mx-auto flex w-full max-w-[1240px] flex-col gap-[72px] bg-white px-5 py-10 sm:px-10 lg:p-20"
      data-testid="style-guide-page"
      data-node-id="1085:814"
    >
      <header className="flex flex-col gap-3" data-testid="style-guide-header">
        <span className="font-mono-martian text-sm text-financy-muted">Figma node 1085:814</span>
        <h1 className="text-[40px] font-medium leading-[1.4] text-financy-heading">Componentes</h1>
      </header>

      <ComponentSection title="Fontes e tokens" testId="section-fonts-and-tokens">
        <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="font-mono-martian text-sm text-[#7c7c8a]">Tipografia</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-financy-border p-5" data-testid="token-font-display">
              <p className="text-[40px] font-medium leading-[1.4] text-financy-heading">
                Plus Jakarta Sans
              </p>
              <p className="mt-2 text-sm text-financy-muted">Títulos, labels e corpo de texto.</p>
            </Card>
            <Card className="border-financy-border p-5" data-testid="token-font-mono">
              <p className="font-mono-martian text-2xl text-financy-text">Martian Mono</p>
              <p className="mt-2 text-sm text-financy-muted">Rótulos técnicos e nomes de tokens.</p>
            </Card>
          </div>
          <div className="font-mono-martian text-sm text-[#7c7c8a]">Cores</div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" data-testid="token-colors">
            {tokenColors.map((color) => (
              <Swatch key={color.name} {...color} />
            ))}
          </div>
          <div className="font-mono-martian text-sm text-[#7c7c8a]">Raios e elevações</div>
          <div className="grid gap-3 md:grid-cols-3" data-testid="token-radius-shadow">
            <Card className="rounded-lg border-financy-border p-5">Radius 8px</Card>
            <Card className="rounded-xl border-financy-border p-5">Radius 12px</Card>
            <Card className="rounded-lg border-financy-border p-5 shadow-lg shadow-black/15">
              Shadow modal/dropdown
            </Card>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Input" testId="section-input">
        <DetailGrid
          labels={[
            "Sem ícone",
            "Ícone esquerdo",
            "Ícone direito",
            "Dois ícones",
            "Error",
            "Disabled",
          ]}
        >
          <Input
            data-testid="input-no-icon"
            label="Label"
            placeholder="Placeholder"
            helper="Helper"
          />
          <Input
            data-testid="input-left-icon"
            label="Label"
            placeholder="Placeholder"
            helper="Helper"
            startIcon={<IconMail className="h-4 w-4" />}
          />
          <Input
            data-testid="input-right-icon"
            state="filled"
            label="Label"
            defaultValue="Text"
            helper="Helper"
            endIcon={<IconEyeClosed className="h-4 w-4" />}
            readOnly
          />
          <Input
            data-testid="input-two-icons"
            state="active"
            label="Label"
            defaultValue="Text"
            helper="Helper"
            startIcon={<IconLock className="h-4 w-4" />}
            endIcon={<IconEyeClosed className="h-4 w-4" />}
            readOnly
          />
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
          <Input
            data-testid="input-disabled"
            state="disabled"
            label="Label"
            defaultValue="Text"
            helper="Helper"
            startIcon={<IconMail className="h-4 w-4" />}
            readOnly
          />
        </DetailGrid>
      </ComponentSection>

      <ComponentSection title="Select" testId="section-select">
        <DetailGrid
          labels={["Default", "Focus", "Open", "Active", "Disabled", "Error", "Validado"]}
        >
          <div className="max-w-md">
            <Select data-testid="select-demo" defaultValue="option-1">
              <option value="option-1">Option 1</option>
              <option value="option-2">Option 2</option>
              <option value="option-3">Option 3</option>
            </Select>
          </div>
          <SelectField label="Label" state="focus" testId="select-focus" />
          <SelectField label="Label" state="open" testId="select-open-static" />
          <SelectField label="Label" state="active" testId="select-active" />
          <SelectField label="Label" state="disabled" testId="select-disabled" />
          <SelectField label="Label" state="error" testId="select-error" />
          <SelectField label="Label" state="valid" testId="select-valid" />
        </DetailGrid>
      </ComponentSection>

      <ComponentSection title="Button" testId="section-button">
        <DetailGrid
          labels={["Primary", "Outline", "Ghost", "Danger", "Disabled", "Pressed", "Com ícones"]}
        >
          <div className="flex flex-wrap gap-3" data-testid="button-primary">
            <Button variant="primary">Label</Button>
            <Button variant="primary" state="hover">
              Hover
            </Button>
          </div>
          <div className="flex flex-wrap gap-3" data-testid="button-outline">
            <Button variant="outline">Label</Button>
            <Button variant="outline" state="hover">
              Hover
            </Button>
          </div>
          <div className="flex flex-wrap gap-3" data-testid="button-ghost">
            <Button variant="ghost">Label</Button>
            <Button variant="ghost" state="hover">
              Hover
            </Button>
          </div>
          <div className="flex flex-wrap gap-3" data-testid="button-danger">
            <Button variant="danger">Label</Button>
            <Button variant="danger" state="hover">
              Hover
            </Button>
          </div>
          <div className="flex flex-wrap gap-3" data-testid="button-disabled">
            <Button variant="primary" state="disabled">
              Label
            </Button>
            <Button variant="outline" state="disabled">
              Label
            </Button>
          </div>
          <div className="flex flex-wrap gap-3" data-testid="button-pressed">
            <Button variant="primary" className="bg-financy-primary-press shadow-inner">
              Pressed
            </Button>
            <Button variant="outline" className="bg-financy-surface-hover shadow-inner">
              Pressed
            </Button>
          </div>
          <div className="flex flex-wrap gap-3" data-testid="button-icons">
            <Button size="sm" startIcon={<IconPlus className="h-4 w-4" />}>
              Label
            </Button>
            <Button size="sm" variant="outline" endIcon={<IconChevronRight className="h-3 w-3" />}>
              Label
            </Button>
          </div>
        </DetailGrid>
      </ComponentSection>

      <ComponentSection title="Icon Button" testId="section-icon-button">
        <DetailGrid labels={["Default", "Hover", "Disabled"]}>
          <div className="flex gap-2" data-testid="icon-btn-default">
            <IconButton variant="outline" aria-label="Add user">
              <IconUserRoundPlus className="h-4 w-4" />
            </IconButton>
            <IconButton variant="danger" aria-label="Delete">
              <IconTrash className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="flex gap-2" data-testid="icon-btn-hover">
            <IconButton variant="outline" state="hover" aria-label="Add user">
              <IconUserRoundPlus className="h-4 w-4" />
            </IconButton>
            <IconButton variant="danger" state="hover" aria-label="Delete">
              <IconTrash className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="flex gap-2" data-testid="icon-btn-disabled">
            <IconButton variant="outline" state="disabled" aria-label="Add user">
              <IconUserRoundPlus className="h-4 w-4" />
            </IconButton>
            <IconButton variant="danger" state="disabled" aria-label="Delete">
              <IconTrash className="h-4 w-4" />
            </IconButton>
          </div>
        </DetailGrid>
      </ComponentSection>

      <ComponentSection title="Link" testId="section-link">
        <DetailGrid labels={["Default", "Inline", "Active", "Hover"]}>
          <TextLink
            data-testid="link-default"
            href="#"
            leftIcon={<IconChevronLeft className="h-3 w-3" />}
          >
            Label
          </TextLink>
          <TextLink data-testid="link-inline" href="#">
            Link inline
          </TextLink>
          <TextLink
            data-testid="link-active"
            href="#"
            className="border-financy-primary text-financy-primary-hover"
          >
            Ativo
          </TextLink>
          <TextLink
            data-testid="link-hover"
            href="#"
            state="hover"
            rightIcon={<IconChevronRight className="h-3 w-3" />}
          >
            Label
          </TextLink>
        </DetailGrid>
      </ComponentSection>

      <ComponentSection title="Pagination" testId="section-pagination">
        <DetailGrid labels={["Anterior disabled", "Default", "Hover", "Active", "Focus"]}>
          <div className="flex gap-2" data-testid="pagination-prev-disabled">
            <PaginationButton label="‹" state="disabled" />
            <PaginationButton label="1" state="active" />
            <PaginationButton label="›" />
          </div>
          <PaginationButton data-testid="pag-default" label="1" state="default" />
          <PaginationButton data-testid="pag-hover" label="1" state="hover" />
          <PaginationButton data-testid="pag-active" label="1" state="active" />
          <PaginationButton
            data-testid="pag-focus"
            label="1"
            className="ring-2 ring-financy-primary/60 ring-offset-2"
          />
        </DetailGrid>
      </ComponentSection>

      <ComponentSection title="Checkbox" testId="section-checkbox">
        <DetailGrid labels={["Default", "Checked", "Disabled"]}>
          <Checkbox data-testid="checkbox-default" label="Lembrar-me" onChange={() => {}} />
          <Checkbox data-testid="checkbox-checked" checked label="Lembrar-me" onChange={() => {}} />
          <Checkbox
            data-testid="checkbox-disabled"
            disabled
            label="Lembrar-me"
            onChange={() => {}}
          />
        </DetailGrid>
      </ComponentSection>

      <ComponentSection title="Tag" testId="section-tag">
        <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="font-mono-martian text-sm text-[#7c7c8a]">Categorias</div>
          <div className="flex flex-wrap gap-2" data-testid="tag-section">
            {tagCategories.map((category) => (
              <Tag
                key={category}
                data-testid={`tag-${category}`}
                category={category}
                onClick={() => {}}
              >
                Label
              </Tag>
            ))}
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Type" testId="section-type">
        <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="font-mono-martian text-sm text-[#7c7c8a]">Status financeiro</div>
          <div className="flex flex-col gap-4" data-testid="type-section">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-financy-success">
              <IconCircleArrowUp className="h-4 w-4" />
              Entrada
            </span>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-financy-danger">
              <IconCircleArrowDown className="h-4 w-4" />
              Saída
            </span>
          </div>
        </div>
      </ComponentSection>

      <ComponentSection title="Ícones e marca" testId="section-icons">
        <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <div className="font-mono-martian text-sm text-[#7c7c8a]">Logo</div>
          <Card
            className="flex items-center gap-4 border-financy-border p-5"
            data-testid="style-guide-logo"
          >
            <img alt="Financy" className="h-10 w-10" src={logoMarkUrl} />
            <div>
              <p className="font-medium text-financy-text">Logo mark</p>
              <p className="text-sm text-financy-muted">Asset oficial da marca</p>
            </div>
          </Card>
          <div className="font-mono-martian text-sm text-[#7c7c8a]">Catálogo</div>
          <div
            className="flex flex-col gap-6"
            data-testid="style-guide-icon-catalog"
            data-icon-count={iconCount}
          >
            {iconGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-financy-text">{group.title}</h3>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
                  {group.icons.map((icon) => (
                    <IconTile key={icon.name} {...icon} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ComponentSection>
    </main>
  );
};
