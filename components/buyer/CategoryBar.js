"use client";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { useT } from "@/lib/i18n/LocaleProvider";

export default function CategoryBar({ selected, onSelect }) {
  const { locale } = useT();

  return (
    <div data-catbar className="flex gap-4 overflow-x-auto pb-2 px-1 py-1 scrollbar-hide">
      {CATEGORY_CONFIG.map((cat) => {
        const isActive = selected === cat.value;
        const label = cat.labels?.[locale] ?? cat.labels?.en ?? cat.value;

        return (
          <button
            key={cat.value}
            onClick={() => onSelect(cat.value)}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            {/* Circle */}
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 overflow-hidden bg-white ${
                isActive
                  ? "border-[3px] border-rose-500 shadow-md scale-105"
                  : "border-2 border-gray-200 group-hover:border-rose-300 group-hover:scale-105"
              }`}
            >
              {cat.img ? (
                <img
                  src={cat.img}
                  alt={label}
                  className="w-10 h-10 object-contain"
                />
              ) : (
                <span className="text-2xl">{cat.emoji}</span>
              )}
            </div>

            {/* Label */}
            <span
              className={`text-[10px] font-semibold text-center leading-tight max-w-[64px] transition-colors ${
                isActive ? "text-rose-600" : "text-gray-500 group-hover:text-gray-700"
              }`}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
