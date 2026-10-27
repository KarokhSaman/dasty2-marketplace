import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";

// Every admin action on a product, with the seller notification and the admin
// log entry that go with it. Shared by the To do, Products, Review and Fees
// screens so they all behave the same.
export function useProductActions() {
  const updateStatus = useMutation(api.products.updateStatus);
  const markUnitSoldMutation = useMutation(api.products.markUnitSold);
  const returnUnitMutation = useMutation(api.products.returnUnit);
  const resolveDeleteRequest = useMutation(api.products.resolveDeleteRequest);
  const removeProduct = useMutation(api.products.remove);
  const setFeaturedMutation = useMutation(api.products.setFeatured);
  const updateDetails = useMutation(api.products.adminUpdateDetails);
  const updatePhotos = useMutation(api.products.adminUpdatePhotos);
  const replacePhoto = useMutation(api.products.adminReplacePhoto);
  const createNotif = useMutation(api.notifications.create);
  const createLog = useMutation(api.adminLogs.create);
  const me = useQuery(api.users.getCurrent);
  const adminEmail = me?.email ?? "admin";

  const notify = (p, message, url = "/seller") =>
    createNotif({ sellerId: p.sellerId, productId: p._id, message, url });
  const log = (action, p, notes) =>
    createLog({
      action,
      productId: p?._id?.toString(),
      productTitle: p?.title,
      productCode: p?.seq,
      sellerName: p?.sellerName,
      price: p?.price,
      notes,
    });

  const isStocked = (p) => p.status === "approved" && p.stock > 1;

  async function approve(p) {
    await updateStatus({ id: p._id, status: "approved", approvedBy: adminEmail });
    await notify(p, m.adminApproveMsg({ title: p.title }), `/products/${p._id}`);
    await log("approved", p);
  }

  async function reject(p, reason) {
    const why = reason.trim();
    await updateStatus({ id: p._id, status: "rejected", notes: why });
    // In Kurdish, matching the Kurdish reasons the seller reads.
    await notify(p, m.adminRejectMsg({ title: p.title, reason: why }, { locale: "ckb" }), `/seller/products/${p._id}/edit?from=rejection`);
    await log("rejected", p, why);
  }

  async function setPending(p) {
    await updateStatus({ id: p._id, status: "pending" });
    await log("status_changed_to_pending", p);
  }

  async function returnUnit(p) {
    await returnUnitMutation({ id: p._id });
    await log("unit_returned", p, "Unit returned to stock");
  }

  // Back to live: a sold unit entry goes back into its listing's stock.
  async function makeLive(p) {
    if (p.soldFromId && (p.status === "sold" || p.status === "paid")) return returnUnit(p);
    return approve(p);
  }

  // ownProfit: our profit, for products of our own stock (fee deal "own").
  async function markSold(p, salePrice, ownProfit) {
    if (isStocked(p)) {
      await markUnitSoldMutation({ id: p._id, status: "sold", salePrice, ownProfit });
      await notify(p, m.adminSoldMsg({ title: p.title }));
      await log("marked_sold", p, `1 unit, ${p.stock - 1} left`);
      return;
    }
    await updateStatus({ id: p._id, status: "sold", dateSold: new Date().toISOString(), salePrice, ownProfit });
    await notify(p, m.adminSoldMsg({ title: p.title }));
    const notes = [
      salePrice && salePrice !== p.price ? `Sale price ${salePrice.toLocaleString("en-US")} IQD` : null,
      ownProfit !== undefined ? `Our profit ${ownProfit.toLocaleString("en-US")} IQD` : null,
    ].filter(Boolean).join(" · ");
    await log("marked_sold", p, notes || undefined);
  }

  async function markPaid(p, salePrice, ownProfit) {
    if (isStocked(p)) {
      await markUnitSoldMutation({ id: p._id, status: "paid", salePrice, ownProfit });
      await notify(p, m.adminPaidMsg({ title: p.title }));
      await log("marked_paid", p, `1 unit, ${p.stock - 1} left`);
      return;
    }
    await updateStatus({ id: p._id, status: "paid", salePrice, ownProfit });
    await notify(p, m.adminPaidMsg({ title: p.title }));
    await log("marked_paid", p);
  }

  async function resolveDelete(p, action) {
    await resolveDeleteRequest({ id: p._id, action });
    if (action === "approve") {
      await notify(p, m.adminDeleteApprovedMsg({ title: p.title }));
      await log("deleted", p, "Deletion request approved");
    } else if (action === "reject") {
      await notify(p, m.adminDeleteRejectedMsg({ title: p.title }));
      await log("delete_rejected", p, "Deletion request declined");
    } else {
      await notify(p, m.adminSoldMsg({ title: p.title }));
      await log("marked_sold", p, "From a deletion request");
    }
  }

  async function remove(p) {
    await removeProduct({ id: p._id });
    await log("deleted", p);
  }

  async function sponsor(p, { until, position, label }) {
    await setFeaturedMutation({ id: p._id, featured: true, featuredUntil: until, featuredPosition: position ?? undefined });
    await log("featured", p, label + (position ? ` - Position #${position}` : ""));
  }

  async function unsponsor(p) {
    await setFeaturedMutation({ id: p._id, featured: false });
    await log("unfeatured", p);
  }

  async function saveDetails(p, next) {
    await updateDetails({ id: p._id, ...next });
    const labels = ["title", "category", "brand", "condition", "description"];
    const changed = labels.filter((k) => (p[k] ?? "") !== (next[k] ?? ""));
    const sold = p.status === "sold" || p.status === "paid";
    const oldPrice = sold ? (p.salePrice ?? p.price) : p.price;
    if (next.price && next.price !== oldPrice) {
      changed.push(`${sold ? "sale price" : "price"} ${oldPrice.toLocaleString("en-US")} → ${next.price.toLocaleString("en-US")} IQD`);
    }
    if (changed.length) await log("details_changed", p, `Changed: ${changed.join(", ")}`);
  }

  async function setMainPhoto(p, i) {
    await updatePhotos({ id: p._id, mainPhotoIndex: i });
    await log("main_photo_set", p, `Photo ${i + 1} set as main`);
  }

  async function removePhoto(p, i) {
    const photos = p.photos.filter((_, j) => j !== i);
    const main = p.mainPhotoIndex ?? 0;
    const mainPhotoIndex = main === i ? undefined : main > i ? main - 1 : main;
    await updatePhotos({ id: p._id, photos, mainPhotoIndex });
    await log("photo_removed", p, `Photo ${i + 1} removed`);
  }

  async function swapPhoto(p, i, oldUrl, newUrl, turns) {
    await replacePhoto({ id: p._id, index: i, oldUrl, newUrl });
    await log("photo_rotated", p, `Photo ${i + 1} rotated ${turns * 90}°`);
  }

  return {
    approve, reject, setPending, makeLive, returnUnit, markSold, markPaid, resolveDelete, remove,
    sponsor, unsponsor, saveDetails, setMainPhoto, removePhoto, swapPhoto, isStocked, log,
  };
}
