import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/utils";

interface JoinOverlayProps {
  joinUrl: string | null;
  joinCode: string | null;
  showQr: boolean;
  showCode: boolean;
  placement: string;
  size?: "large" | "small";
}

const placementClasses: Record<string, string> = {
  top_left: "top-6 left-6",
  top_right: "top-6 right-6",
  bottom_left: "bottom-6 left-6",
  bottom_right: "bottom-6 right-6",
  top_center: "top-6 left-1/2 -translate-x-1/2",
  bottom_center: "bottom-6 left-1/2 -translate-x-1/2",
  center_top: "top-16 left-1/2 -translate-x-1/2",
  center_bottom: "bottom-16 left-1/2 -translate-x-1/2",
};

export function JoinOverlay({ joinUrl, joinCode, showQr, showCode, placement, size = "large" }: JoinOverlayProps) {
  if ((!showQr && !showCode) || (!joinUrl && !joinCode)) return null;

  const posClass = placementClasses[placement] || placementClasses.bottom_right;
  const qrSize = size === "large" ? 180 : 40;

  return (
    <div className={cn("absolute z-30 flex flex-col items-center gap-3", posClass)}>
      <div className="bg-black/70 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center gap-3 border border-white/10">
        {showQr && joinUrl && (
          <div className="bg-white rounded-xl p-2">
            <QRCodeSVG
              value={joinUrl}
              size={qrSize}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
              includeMargin={false}
            />
          </div>
        )}
        {showCode && joinCode && (
          <div className="text-center">
            {size === "large" && <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Join Code</p>}
            <p className={cn(
              "font-mono font-bold tracking-[0.3em] text-white",
              size === "large" ? "text-3xl" : "text-lg"
            )}>
              {joinCode}
            </p>
          </div>
        )}
        {size === "large" && (
          <p className="text-[10px] text-white/30">Scan QR or enter code to connect</p>
        )}
      </div>
    </div>
  );
}
