import { useEffect, useState } from "react";

interface Props {
  endTime: string;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function CountdownTimer({ endTime }: Props) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(endTime).getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  });

  useEffect(() => {
    const id = setInterval(() => {
      const diff = new Date(endTime).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(diff / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (remaining <= 0) {
    return (
      <span className="font-bold text-sm text-white tracking-wide">ENDED</span>
    );
  }

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="inline-block bg-[#222] text-white font-bold text-sm px-1.5 py-0.5 rounded-sm min-w-6.5 text-center">
        {pad(h)}
      </span>
      <span className="text-white font-bold mx-0.75">:</span>
      <span className="inline-block bg-[#222] text-white font-bold text-sm px-1.5 py-0.5 rounded-sm min-w-6.5 text-center">
        {pad(m)}
      </span>
      <span className="text-white font-bold mx-0.75">:</span>
      <span className="inline-block bg-[#222] text-white font-bold text-sm px-1.5 py-0.5 rounded-sm min-w-6.5 text-center">
        {pad(s)}
      </span>
    </span>
  );
}
