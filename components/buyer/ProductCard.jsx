import { Link } from "@tanstack/react-router";
import * as m from "@/src/paraglide/messages";
import { getLocale } from "@/src/paraglide/runtime";
import { getCategoryLabel } from "@/lib/categories";
import { setProductCache } from "@/src/lib/productCache";

function formatPrice(price) {
  return price.toLocaleString("en-US") + " IQD";
}

export default function ProductCard({ product, onSave }) {
  const locale = getLocale();
  const photo = product.photos?.[0];
  setProductCache(product);

  return (
    <Link to={`/products/${product._id}`} className="group block" onClick={onSave}>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md hover:border-rose-100 transition-all duration-200">
        {/* Image */}
        <div className="aspect-square bg-gray-100 relative overflow-hidden">
          {photo ? (
            <img
              src={photo}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="absolute top-2 start-2 flex flex-col gap-1">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                product.condition === "new"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {product.condition === "new" ? m.badgeNew() : m.badgeUsed()}
            </span>
            {product.featured && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-600">
                {m.featured()}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-xs text-gray-400 mb-1">{getCategoryLabel(product.category, locale)}</p>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-2 min-h-[2.5rem]">
            {product.title}
          </h3>
          <p className="text-rose-600 font-bold text-sm">{formatPrice(product.price)}</p>
        </div>
      </div>
    </Link>
  );
}
