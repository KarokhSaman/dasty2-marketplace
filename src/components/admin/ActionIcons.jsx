// Line icons for the admin product card actions (thin, rounded strokes).
function Icon({ children, className = "w-[18px] h-[18px]", filled = false }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const StatusIcons = {
  pending: (
    <Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon>
  ),
  approved: (
    <Icon><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.5 2.5 4.5-5" /></Icon>
  ),
  rejected: (
    <Icon><circle cx="12" cy="12" r="9" /><path d="m15 9-6 6M9 9l6 6" /></Icon>
  ),
  sold: (
    <Icon><path d="M6 7h12l-1 13H7L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></Icon>
  ),
  paid: (
    <Icon><rect x="3" y="6" width="18" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.2" /><path d="M6.5 12h.01M17.5 12h.01" /></Icon>
  ),
  deletion_requested: (
    <Icon><path d="M6 3h12M6 21h12" /><path d="M7 3v3.2a3 3 0 0 0 .9 2.1L12 12l4.1-3.7a3 3 0 0 0 .9-2.1V3" /><path d="M7 21v-3.2a3 3 0 0 1 .9-2.1L12 12l4.1 3.7a3 3 0 0 1 .9 2.1V21" /></Icon>
  ),
};

const STAR = "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5Z";

export function StarIcon({ filled = false }) {
  return <Icon filled={filled}><path d={STAR} /></Icon>;
}

export function EditIcon() {
  return (
    <Icon><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m13.5 8.5 3 3" /></Icon>
  );
}

export function TrashIcon() {
  return (
    <Icon><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></Icon>
  );
}

// Shared look for the icon buttons: soft tinted square, thin ring, slight press.
export const iconButtonCls =
  "w-9 h-9 inline-flex items-center justify-center rounded-xl ring-1 ring-inset transition-all duration-150 hover:shadow-sm active:scale-95";
