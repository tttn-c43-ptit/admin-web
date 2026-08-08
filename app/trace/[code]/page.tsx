"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiClient as api } from "@/lib/api-client";
import { PublicTrace } from "@/types";
import { format } from "date-fns";
import { Leaf, Calendar, CheckCircle2, Tractor, Activity, Loader2, MapPin, Copy, Check, Globe } from "lucide-react";
import { useTranslation } from "@/components/i18n-provider";

export default function PublicTracePage() {
  const { t, language, setLanguage } = useTranslation();
  const params = useParams();
  const code = params.code as string;
  const [copied, setCopied] = useState(false);

  const { data: traceData, isLoading, error } = useQuery({
    queryKey: ["trace", code],
    queryFn: () => api.get(`api/trace/${code}`).json<PublicTrace>(),
    retry: false,
  });

  const handleCopy = () => {
    if (traceData?.code) {
      navigator.clipboard.writeText(traceData.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === "vi" ? "en" : "vi");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfaf6]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !traceData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfaf6] p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t("publicTrace.notFoundTitle")}</h1>
          <p className="text-gray-600">
            {t("publicTrace.notFoundDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] font-sans text-gray-800 selection:bg-emerald-800 selection:text-white pb-12">
      {/* Header Banner - Full Width Rich Emerald Curved Header */}
      <div className="w-full bg-gradient-to-r from-emerald-950 via-green-900 to-teal-950 text-white pt-8 pb-12 px-4 sm:px-8 rounded-b-[2rem] shadow-lg relative overflow-hidden selection:bg-emerald-950 selection:text-emerald-100">
        {/* Decorative background glows */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5 text-center sm:text-left">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner shrink-0">
              <Leaf className="w-7 h-7 text-green-200" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">{t("publicTrace.title")}</h1>
              <p className="text-xs sm:text-sm text-green-100/80 font-medium">{t("publicTrace.subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md px-3 py-2 rounded-xl border border-white/25 text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all duration-200"
            >
              <Globe className="w-4 h-4 text-green-200" />
              <span>{language === "vi" ? "VI" : "EN"}</span>
            </button>

            <button
              onClick={handleCopy}
              title="Click to copy trace code"
              className="group bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md px-4 py-2 rounded-xl border border-white/25 font-mono text-xs sm:text-sm font-bold tracking-wider text-white shadow-sm flex items-center gap-2 transition-all duration-200"
            >
              <span>{traceData.code}</span>
              {copied ? (
                <Check className="w-4 h-4 text-green-300 animate-in zoom-in" />
              ) : (
                <Copy className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto -mt-4 px-4 space-y-6">
        
        {/* Main Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("publicTrace.batch")}</h3>
                <p className="text-xl font-medium text-gray-900">{traceData.batch_name || t("publicTrace.standardBatch")}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("publicTrace.variety")}</h3>
                <p className="text-gray-900 font-medium">{traceData.variety || t("publicTrace.notSpecified")}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("publicTrace.originGarden")}</h3>
                <div className="flex items-start gap-2 text-gray-900 font-medium mt-1">
                  <MapPin className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    {traceData.garden.name}
                    {traceData.garden.address && (
                      <div className="text-sm text-gray-500 font-normal mt-0.5">{traceData.garden.address}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
               <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("publicTrace.harvestDate")}</h3>
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  {traceData.harvest_date ? format(new Date(traceData.harvest_date), "MMMM d, yyyy") : t("publicTrace.notSpecified")}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">{t("publicTrace.verifiedOrigin")}</h3>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 inline-flex font-medium">
                  <CheckCircle2 className="w-4 h-4" /> {t("publicTrace.authenticSource")}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Story / Journey */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" /> {t("publicTrace.lifecycleTitle")}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-900">{traceData.plant_count}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{t("publicTrace.plants")}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-900">{traceData.total_harvested_kg}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{t("publicTrace.totalYield")}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-900">{traceData.care_reports}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{t("publicTrace.careReports")}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <div className="text-sm font-bold text-gray-900 mt-1">
                {traceData.planted_from ? format(new Date(traceData.planted_from), "MMM yyyy") : "-"}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">{t("publicTrace.planted")}</div>
            </div>
          </div>
        </div>

        {/* Public Info Details */}
        {traceData.public_info && Object.keys(traceData.public_info).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-green-600" /> {t("publicTrace.additionalDetails")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(traceData.public_info).map(([key, value]) => (
                <div key={key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {key.replace(/_/g, " ")}
                  </div>
                  <div className="text-gray-800 font-medium">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="text-center mt-12 text-gray-400 text-sm font-medium">
        {t("publicTrace.poweredBy")}
      </div>
    </div>
  );
}
