import {
  IconArrowUpDown,
  IconBaggageClaim,
  IconBookOpen,
  IconBriefcaseBusiness,
  IconCarFront,
  IconDumbbell,
  IconGift,
  IconHeartPulse,
  IconHouse,
  IconMailbox,
  IconPawPrint,
  IconPiggyBank,
  IconReceiptText,
  IconShoppingCart,
  IconTag,
  IconTicket,
  IconToolCase,
  IconUtensils,
} from "@/assets/icons";
import type { ComponentType, SVGProps } from "react";

type CategoryIconKey =
  | "tag"
  | "arrow-up-down"
  | "utensils"
  | "car-front"
  | "shopping-cart"
  | "ticket"
  | "piggy-bank"
  | "briefcase-business"
  | "heart-pulse"
  | "tool-case"
  | "paw-print"
  | "house"
  | "gift"
  | "dumbbell"
  | "book-open"
  | "baggage-claim"
  | "mailbox"
  | "receipt-text";

type CategoryIconProps = {
  icon: string;
  className?: string;
};

const iconMap: Record<CategoryIconKey, ComponentType<SVGProps<SVGSVGElement>>> = {
  tag: IconTag,
  "arrow-up-down": IconArrowUpDown,
  utensils: IconUtensils,
  "car-front": IconCarFront,
  "shopping-cart": IconShoppingCart,
  ticket: IconTicket,
  "piggy-bank": IconPiggyBank,
  "briefcase-business": IconBriefcaseBusiness,
  "heart-pulse": IconHeartPulse,
  "tool-case": IconToolCase,
  "paw-print": IconPawPrint,
  house: IconHouse,
  gift: IconGift,
  dumbbell: IconDumbbell,
  "book-open": IconBookOpen,
  "baggage-claim": IconBaggageClaim,
  mailbox: IconMailbox,
  "receipt-text": IconReceiptText,
};

const resolveCategoryIconKey = (value: string): CategoryIconKey => {
  if (value in iconMap) {
    return value as CategoryIconKey;
  }
  return "tag";
};

export const CategoryIcon = ({ icon, className }: CategoryIconProps) => {
  const resolvedKey = resolveCategoryIconKey(icon);
  const Icon = iconMap[resolvedKey];
  return <Icon className={className} />;
};
