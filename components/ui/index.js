// Shared UI primitives — re-exported for ergonomic imports:
//   import { Chip, Button, PriceTag, ... } from "@/components/ui";

export { default as Chip }         from "./Chip";
export { default as Button }       from "./Button";
export { default as IconButton }   from "./IconButton";
export { default as SelectMenu }   from "./SelectMenu";
export { default as Popover }      from "./Popover";
export { default as FloatingCount } from "./FloatingCount";
export { default as SegmentedControl } from "./SegmentedControl";
export { default as SearchInput }    from "./SearchInput";
export { default as Skeleton }     from "./Skeleton";
export { default as PriceTag, formatAmount } from "./PriceTag";
export { default as SectionHeader } from "./SectionHeader";
export { default as WhatsAppButton } from "./WhatsAppButton";
export { default as WhatsAppIcon }  from "./WhatsAppIcon";

export { useClickOutside } from "./useClickOutside";
