"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { ScanResult, Zone, TagStatus, TagType } from "@/types";
import { queryKeys } from "@/lib/query-keys";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlantStatusBadge } from "@/components/plant-status-badge";
import {
  Search,
  Loader2,
  QrCode,
  Barcode,
  TreeDeciduous,
  MapPin,
  ClipboardList,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/components/i18n-provider";

interface TestScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SAMPLE_TAGS = [
  { code: "QR-SR-0001", type: "QR", label: "Cây #01 (Sầu riêng)" },
  { code: "QR-SR-0002", type: "QR", label: "Cây #02 (Sầu riêng)" },
  { code: "QR-SR-0003", type: "QR", label: "Cây #03 (Sầu riêng)" },
  { code: "QR-SR-0104", type: "QR", label: "Cây #04 (Đã thay thẻ)" },
  { code: "BC-SR-0009", type: "BARCODE", label: "Cây #09 (Mã vạch)" },
];

export function TestScanDialog({ open, onOpenChange }: TestScanDialogProps) {
  const { t } = useTranslation();
  const [scanCode, setScanCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");

  const { data: scanResult, isLoading, isError } = useQuery<ScanResult>({
    queryKey: ["tag_lookup", searchedCode],
    queryFn: () => api.get(`api/tags/lookup/${encodeURIComponent(searchedCode)}`).json(),
    enabled: !!searchedCode,
    retry: false,
  });

  const { data: zones } = useQuery<Zone[]>({
    queryKey: queryKeys.zones(scanResult?.garden.id || ""),
    queryFn: () => api.get(`api/gardens/${scanResult!.garden.id}/zones`).json(),
    enabled: !!scanResult?.garden.id,
  });

  const getZoneName = (zoneId: string | null) => {
    if (!zoneId) return t("createPlant.noneZone");
    const zone = zones?.find((z) => z.id === zoneId);
    return zone ? zone.name : zoneId.substring(0, 8) + "...";
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanCode.trim()) {
      setSearchedCode(scanCode.trim());
    }
  };

  const handleQuickSelect = (code: string) => {
    setScanCode(code);
    setSearchedCode(code);
  };

  const getTagStatusBadge = (status: TagStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">{t("testScan.activeTag")}</Badge>;
      case "REPLACED":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">{t("testScan.replacedTag")}</Badge>;
      case "DAMAGED":
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300">{t("testScan.damagedTag")}</Badge>;
      case "LOST":
        return <Badge className="bg-rose-100 text-rose-800 border-rose-300">{t("testScan.lostTag")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            <QrCode className="h-5 w-5 text-emerald-600" />
            {t("testScan.title")}
          </DialogTitle>
        </DialogHeader>

        {/* Search input form */}
        <form onSubmit={handleSearch} className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Input
              placeholder={t("testScan.placeholder")}
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              className="pr-8"
              autoFocus
            />
          </div>
          <Button type="submit" disabled={isLoading || !scanCode.trim()} className="bg-emerald-600 hover:bg-emerald-700">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        {/* Quick sample chips */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>{t("testScan.sampleCodes")}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_TAGS.map((sample) => (
              <button
                key={sample.code}
                type="button"
                onClick={() => handleQuickSelect(sample.code)}
                className={`text-xs px-2.5 py-1 rounded-md border font-mono transition-all flex items-center gap-1.5 ${
                  searchedCode === sample.code
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                }`}
              >
                {sample.type === "QR" ? (
                  <QrCode className="h-3 w-3 text-emerald-600" />
                ) : (
                  <Barcode className="h-3 w-3 text-blue-600" />
                )}
                <span>{sample.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Result Area */}
        <div className="min-h-[220px] rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-48 text-slate-500 gap-2">
              <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">{t("testScan.loading")}</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col justify-center items-center h-48 text-center px-4">
              <AlertCircle className="h-10 w-10 text-rose-500 mb-2 opacity-80" />
              <p className="text-sm font-semibold text-rose-700">{t("testScan.notFound")}</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">{t("testScan.notFoundDesc")}</p>
            </div>
          ) : scanResult ? (
            <div className="space-y-4">
              {/* Plant code & Status header */}
              <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TreeDeciduous className="h-5 w-5 text-emerald-600" />
                    <h3 className="font-bold text-lg text-slate-900">{scanResult.plant.code}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                    <span className="flex items-center gap-1">
                      {scanResult.tag.tag_type === "QR" ? (
                        <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Barcode className="h-3.5 w-3.5 text-blue-600" />
                      )}
                      <strong>{scanResult.tag.tag_code}</strong>
                    </span>
                    <span>•</span>
                    {getTagStatusBadge(scanResult.tag.status)}
                  </div>
                </div>
                <PlantStatusBadge status={scanResult.plant.status} />
              </div>

              {/* Garden & Zone info */}
              <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200/80 text-xs">
                <div className="space-y-1">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    {t("testScan.garden")}:
                  </span>
                  <span className="font-semibold text-slate-900 block truncate">{scanResult.garden.name}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-500 font-medium">{t("testScan.zone")}:</span>
                  <span className="font-semibold text-slate-900 block truncate">
                    {getZoneName(scanResult.plant.zone_id)}
                  </span>
                </div>
              </div>

              {/* Latest Care Log */}
              {scanResult.recent_logs && scanResult.recent_logs.length > 0 && (
                <div className="space-y-1.5 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 text-xs">
                  <span className="font-semibold text-emerald-950 flex items-center gap-1">
                    <ClipboardList className="h-3.5 w-3.5 text-emerald-700" />
                    {t("testScan.latestLog")}:
                  </span>
                  <div className="text-slate-700 pl-4 border-l-2 border-emerald-400 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-medium text-slate-900">{scanResult.recent_logs[0].status}</span>
                      <span className="text-slate-500">{formatDate(scanResult.recent_logs[0].created_at)}</span>
                    </div>
                    {scanResult.recent_logs[0].note && (
                      <p className="text-slate-600 italic line-clamp-2">"{scanResult.recent_logs[0].note}"</p>
                    )}
                  </div>
                </div>
              )}

              {/* Direct Link to Plant Detail Page */}
              <Link href={`/plants/${scanResult.plant.id}`} className="block pt-1" onClick={() => onOpenChange(false)}>
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold gap-1.5 h-9">
                  <span>{t("testScan.viewPlant")}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-48 text-center text-slate-500 px-4">
              <QrCode className="h-10 w-10 text-slate-300 mb-2 stroke-[1.5]" />
              <p className="text-xs max-w-xs leading-relaxed">{t("testScan.emptyDesc")}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
