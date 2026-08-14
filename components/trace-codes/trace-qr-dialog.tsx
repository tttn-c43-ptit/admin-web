"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, Download, Copy, ExternalLink, Check, Printer, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TraceCode } from "@/types";

interface TraceQrDialogProps {
  traceItem: TraceCode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TraceQrDialog({
  traceItem,
  open,
  onOpenChange,
}: TraceQrDialogProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Full public URL for consumer to scan
  const publicUrl = typeof window !== "undefined" && traceItem
    ? `${window.location.origin}/trace/${traceItem.code}`
    : "";

  useEffect(() => {
    if (publicUrl && open) {
      QRCode.toDataURL(publicUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#064e3b", // Deep emerald dark color
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Failed to generate QR code", err));
    }
  }, [publicUrl, open]);

  if (!traceItem) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Đã sao chép đường link truy xuất nguồn gốc");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `QR-Truy-Xuat-${traceItem.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Đã tải ảnh mã QR tem nhãn thành công");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Tem truy xuất nguồn gốc - ${traceItem.code}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 2px solid #059669; border-radius: 16px; padding: 24px; text-align: center; max-width: 320px; }
            h2 { color: #064e3b; margin: 0 0 8px 0; font-size: 18px; }
            p { color: #475569; margin: 4px 0; font-size: 12px; }
            img { width: 200px; height: 200px; margin: 12px 0; }
            .code { font-family: monospace; font-weight: bold; background: #ecfdf5; color: #047857; padding: 4px 8px; border-radius: 6px; display: inline-block; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <h2>🌱 TEM TRUY XUẤT NGUỒN GỐC</h2>
            <p>${traceItem.batch_name || "Nông sản sạch chính hãng"}</p>
            <img src="${qrDataUrl}" alt="QR" />
            <div><span class="code">${traceItem.code}</span></div>
            <p style="margin-top: 8px; font-size: 11px; color: #64748b;">Quét mã để xem nhật ký canh tác & nguồn gốc</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] text-center">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-emerald-900 text-lg">
            <QrCode className="h-5 w-5 text-emerald-600" />
            Mã QR Tem Truy Xuất Nguồn Gốc
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Batch & code info */}
          <div className="space-y-1">
            <h3 className="font-bold text-base text-slate-900">
              {traceItem.batch_name || "Lô nông sản tiêu chuẩn"}
            </h3>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-muted-foreground">Mã truy xuất:</span>
              <Badge variant="outline" className="font-mono font-bold text-emerald-800 bg-emerald-50 border-emerald-300">
                {traceItem.code}
              </Badge>
            </div>
          </div>

          {/* QR Code Container */}
          <div className="relative mx-auto w-64 h-64 p-3 bg-white rounded-2xl border-2 border-emerald-200 shadow-md flex items-center justify-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`QR Code ${traceItem.code}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="text-sm text-slate-400">Đang tạo mã QR...</div>
            )}
          </div>

          {/* Helper hint */}
          <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2.5 text-xs text-emerald-800 flex items-center justify-center gap-1.5">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Người tiêu dùng dùng Camera / Zalo quét mã này để xem thông tin xuất xứ.</span>
          </div>

          {/* Public Link Display & Copy */}
          <div className="flex items-center gap-1.5 p-2 bg-slate-50 rounded-lg border text-xs text-slate-700">
            <span className="truncate font-mono flex-1 text-left">{publicUrl}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-500 hover:text-emerald-600"
              onClick={handleCopyLink}
              title="Sao chép link"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadQr}
              className="text-xs gap-1 h-9"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Tải ảnh PNG</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs gap-1 h-9"
            >
              <Printer className="h-3.5 w-3.5 text-blue-600" />
              <span>In tem nhãn</span>
            </Button>

            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-xs gap-1 h-9"
              onClick={() => window.open(publicUrl, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Xem trang Web</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
