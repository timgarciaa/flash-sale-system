import { useEffect, useRef, useState } from "react";
import { fetchStatus, type SaleStatus } from "./api/saleApi";
import { ProductGallery } from "./components/ProductGallery";
import { SaleStatus as SaleStatusComponent } from "./components/SaleStatus";
import { PurchaseForm } from "./components/PurchaseForm";
import { Toaster } from "@/components/ui/sonner";
import macbookpro from "./assets/macbookpro.png";
import macbookpro2 from "./assets/macbookpro2.png";
import macbookpro3 from "./assets/macbookpro3.png";
import macbookpro4 from "./assets/macbookpro4.png";

const productImages = [macbookpro, macbookpro2, macbookpro3, macbookpro4];

function App() {
  const [status, setStatus] = useState<SaleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadStatus() {
    try {
      const data = await fetchStatus();
      setStatus(data);
      setError(null);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load sale status",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const salePrice = 1799;
  const originalPrice = 2499;
  const discountPct = Math.round((1 - salePrice / originalPrice) * 100);

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-[#222]">
      <div className="bg-orange h-14 flex items-center px-10">
        <span className="text-white font-extrabold text-2xl tracking-tight">
          Flash Sale
        </span>

        <div ref={avatarRef} className="ml-auto relative">
          <button
            onClick={() => setAvatarOpen((o) => !o)}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            {userId.trim() ? (
              <span className="text-sm font-bold leading-none">
                {userId.trim().slice(0, 2).toUpperCase()}
              </span>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            )}
          </button>

          {avatarOpen && (
            <div className="absolute right-0 top-11 w-64 bg-white rounded shadow-lg p-4 z-50">
              <label className="block text-sm font-semibold text-[#222] mb-1.5">
                User ID
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Enter your user ID"
                className="w-full px-3 py-2 rounded border-[1.5px] border-[#e0e0e0] text-sm outline-none text-[#222]"
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-300 mx-auto px-4 py-5">
        {error && (
          <div className="bg-[#fff3cd] text-[#856404] px-4 py-2.5 rounded text-sm mb-4">
            {error}
          </div>
        )}

        <div className="bg-white rounded shadow-sm flex flex-wrap">
          <ProductGallery
            images={productImages}
            mainImageAlt="MacBook Pro 14-inch"
          />

          <div className="flex-1 min-w-75 p-6 box-border">
            <h1 className="text-xl font-semibold leading-snug mb-2.5 text-[#222]">
              MacBook Pro 14-inch (M3 Pro, 2024) — Space Black — 18GB RAM /
              512GB SSD
            </h1>

            <div className="flex items-center gap-3 mb-4 text-sm text-[#757575]">
              <span className="text-orange font-semibold border-b border-orange">
                4.8
              </span>
              <span className="text-[#f5a623] tracking-tight">★★★★★</span>
              <span className="border-l border-[#e0e0e0] pl-3">
                3.6K Ratings
              </span>
              <span className="border-l border-[#e0e0e0] pl-3">10K+ Sold</span>
            </div>

            <div className="mb-4">
              <SaleStatusComponent status={status} loading={loading} />
            </div>

            <div className="bg-orange-light p-4 rounded mb-4">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-[1.875rem] font-bold text-orange">
                  ${salePrice.toLocaleString()}
                </span>
                <span className="text-base text-[#aaa] line-through">
                  ${originalPrice.toLocaleString()}
                </span>
                <span className="bg-orange text-white font-bold text-xs px-2 py-0.5 rounded-sm">
                  {discountPct}% OFF
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
              <span className="text-sm text-[#757575] min-w-20">Vouchers</span>
              {["$20 OFF", "$15 OFF", "$8 OFF"].map((v) => (
                <span
                  key={v}
                  className="border border-orange text-orange text-xs font-semibold px-2 py-0.75 rounded-sm cursor-pointer"
                >
                  {v}
                </span>
              ))}
            </div>

            <div className="flex items-start gap-2.5 mb-3 text-sm">
              <span className="text-[#757575] min-w-20">Shipping</span>
              <div>
                <div className="text-[#222] mb-0.5">
                  Guaranteed to get by <strong>21–23 Mar</strong>
                </div>
                <div className="text-[#757575]">
                  Standard Delivery · Free shipping on orders over $50
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 mb-5 text-sm">
              <span className="text-[#757575] min-w-20">Guarantee</span>
              <span className="text-[#222]">
                Free &amp; Easy Returns · Cracked Screen Coverage · 1-Year
                Warranty
              </span>
            </div>

            <hr className="border-0 border-t border-[#f0f0f0] mb-5" />

            <PurchaseForm
              saleStatus={status}
              userId={userId}
              setUserId={setUserId}
            />
          </div>
        </div>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default App;
