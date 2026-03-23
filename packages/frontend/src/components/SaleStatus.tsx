import type { SaleStatus as SaleStatusType } from "../api/saleApi";
import { CountdownTimer } from "./CountdownTimer";

interface Props {
  status: SaleStatusType | null;
  loading: boolean;
}

export function SaleStatus({ status, loading }: Props) {
  if (loading && !status) {
    return (
      <div className="bg-orange rounded px-4 py-2.5 text-white text-sm font-bold">
        Loading...
      </div>
    );
  }

  if (!status) {
    return (
      <div className="bg-orange rounded px-4 py-2.5 text-white text-sm font-bold">
        ⚡ FLASH DEALS
      </div>
    );
  }

  if (status.status === "ended") {
    return (
      <div className="bg-orange rounded px-4 py-2.5 flex items-center justify-between gap-3">
        <span className="text-white font-extrabold text-base tracking-wide flex items-center gap-1.5">
          ⚡ FLASH DEALS
        </span>
        <span className="flex items-center gap-2 text-white text-[0.8rem] font-semibold">
          SALE ENDED
        </span>
      </div>
    );
  }

  const label = status.status === "upcoming" ? "STARTS IN" : "ENDS IN";
  const targetTime =
    status.status === "upcoming" ? status.startTime : status.endTime;

  return (
    <div className="bg-orange rounded px-4 py-2.5 mt-10 flex items-center justify-between gap-3">
      <span className="text-white font-extrabold text-base tracking-wide flex items-center gap-1.5">
        ⚡ FLASH DEALS
      </span>
      <span className="flex items-center gap-2 text-white text-[0.8rem] font-semibold">
        <span>⏱ {label}</span>
        <CountdownTimer endTime={targetTime} />
      </span>
    </div>
  );
}
