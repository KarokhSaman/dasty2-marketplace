import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { useSellerSession } from "@/lib/useSellerSession";
import ProductForm from "@/components/seller/ProductForm";
import { IconCheck } from "@/components/admin/ui";

export function BackLink({ onClick }) {
  const locale = getLocale();
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[var(--color-ember-600)]">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d={locale === "en" ? "M15 19l-7-7 7-7" : "M9 19l7-7-7-7"} />
      </svg>
      {m.back()}
    </button>
  );
}

export function SubmittedState({ onBack }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 gap-3">
      <div className="w-16 h-16 rounded-full bg-st-approved-bg text-st-approved grid place-items-center"><IconCheck className="w-8 h-8" /></div>
      <p className="font-semibold max-w-sm">{m.productSubmitted()}</p>
      <button type="button" onClick={onBack} className="mt-2 h-11 px-5 rounded-[13px] bg-[var(--color-ember-500)] text-white text-[14px] font-bold shadow-[0_10px_22px_-12px_rgba(237,0,64,0.7)] hover:opacity-90">{m.sellerDashboard()}</button>
    </div>
  );
}

export default function AddProductPage() {
  const router = useRouter();
  const { seller, loading } = useSellerSession();
  const addProduct = useMutation(api.products.add);
  const activeOffer = useQuery(api.offers.getActive);
  const [submitted, setSubmitted] = useState(false);
  const toDashboard = () => router.navigate({ to: "/seller" });

  if (loading || !seller) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" /></div>;
  }
  if (submitted) return <SubmittedState onBack={toDashboard} />;

  return (
    <ProductForm
      seller={seller}
      activeOffer={activeOffer ?? null}
      submitLabel={m.submitProductBtn()}
      onSubmit={async (values) => { await addProduct(values); setSubmitted(true); }}
      top={
        <div className="space-y-3">
          <BackLink onClick={toDashboard} />
          <h1 className="text-[22px] font-bold tracking-[-0.01em]">{m.addProductTitle()}</h1>
        </div>
      }
    />
  );
}
