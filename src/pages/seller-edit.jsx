import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { useSellerSession } from "@/lib/useSellerSession";
import ProductForm from "@/components/seller/ProductForm";
import { BackLink, SubmittedState } from "@/pages/seller-add";

const EDITABLE_STATUSES = ["pending", "approved", "rejected"];

export default function EditProductPage() {
  const { id } = useParams({ strict: false });
  const router = useRouter();
  const { seller, loading } = useSellerSession();
  const product = useQuery(api.products.getById, id ? { id } : "skip");
  const sellerUpdate = useMutation(api.products.sellerUpdate);
  const [submitted, setSubmitted] = useState(false);
  const toDashboard = () => router.navigate({ to: "/seller" });

  if (loading || !seller || product === undefined) {
    return <div className="flex items-center justify-center min-h-[60vh]"><div className="w-8 h-8 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" /></div>;
  }

  const blocked = !product || product.sellerId !== seller._id ? m.notFound() : !EDITABLE_STATUSES.includes(product.status) ? m.cannotEdit() : null;
  if (blocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-adm-fade">
        <p className="text-lg font-medium">{blocked}</p>
        <BackLink onClick={toDashboard} />
      </div>
    );
  }
  if (submitted) return <SubmittedState onBack={toDashboard} />;

  return (
    <ProductForm
      initial={product}
      seller={seller}
      // The offer from the day it was posted decides the fee, not today's offer.
      activeOffer={product.postingOffer ?? null}
      submitLabel={m.editProductBtn()}
      onSubmit={async (values) => { await sellerUpdate({ id, ...values }); setSubmitted(true); }}
      top={
        <div className="space-y-3">
          <BackLink onClick={toDashboard} />
          <h1 className="text-[22px] font-bold tracking-[-0.01em]">{m.editProductTitle()}</h1>
          {product.status === "rejected" && product.notes && (
            <div className="rounded-2xl bg-st-rejected-bg px-4 py-3">
              <p className="text-[12px] font-bold text-st-rejected">{m.statusRejected()}</p>
              <p className="text-[14px] text-adm-ink mt-0.5">{product.notes}</p>
            </div>
          )}
          <p className="rounded-2xl bg-st-pending-bg text-st-pending px-4 py-3 text-[13px] font-semibold">{m.editNote()}</p>
        </div>
      }
    />
  );
}
