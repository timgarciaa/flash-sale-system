import { useState } from "react";
import { toast } from "sonner";
import { type SaleStatus, attemptPurchase } from "../api/saleApi";

interface Props {
  saleStatus: SaleStatus | null;
  userId: string;
  setUserId: (v: string) => void;
}

export function PurchaseForm({ saleStatus, userId }: Props) {
  const [loading, setLoading] = useState(false);

  const isActive = saleStatus?.status === "active";
  const stockRemaining = saleStatus?.stockRemaining ?? 0;

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim()) {
      toast.error("Please enter a user ID.");
      return;
    }
    setLoading(true);
    try {
      const result = await attemptPurchase(userId.trim());
      if (result.success) {
        toast.success(result.message);
      } else if (result.alreadyPurchased) {
        toast.info(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10">
      <div className="flex items-center gap-2.5 mb-3.5">
        {stockRemaining > 0 ? (
          <span className="bg-[#e8f5e9] text-[#2e7d32] font-bold text-xs px-2 py-0.5 rounded-sm tracking-wide">
            IN STOCK
          </span>
        ) : (
          <span className="bg-[#fce4ec] text-[#c62828] font-bold text-xs px-2 py-0.5 rounded-sm tracking-wide">
            OUT OF STOCK
          </span>
        )}
        {saleStatus && (
          <span className="text-sm text-[#757575]">
            {stockRemaining} items left
          </span>
        )}
      </div>

      <form onSubmit={handlePurchase}>
        <div className="flex gap-3 mb-3">
          <button
            type="submit"
            disabled={!isActive || loading || !userId.trim()}
            className={`flex-1 py-3 rounded border-none font-bold text-[0.95rem] transition-colors ${
              isActive && !loading && userId.trim()
                ? "bg-orange text-white cursor-pointer"
                : "bg-[#e0e0e0] text-[#999] cursor-not-allowed"
            }`}
          >
            {loading ? "Processing..." : "Buy Now"}
          </button>
        </div>
      </form>

      {!isActive && saleStatus && (
        <p className="text-sm text-[#757575] m-0">
          {saleStatus.status === "upcoming"
            ? "Sale has not started yet. Come back later!"
            : "This sale has ended."}
        </p>
      )}
    </div>
  );
}
