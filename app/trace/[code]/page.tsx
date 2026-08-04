"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { apiClient as api } from "@/lib/api-client";
import { PublicTrace } from "@/types";
import { format } from "date-fns";
import { Leaf, Calendar, CheckCircle2, Tractor, Activity, Loader2, MapPin } from "lucide-react";

export default function PublicTracePage() {
  const params = useParams();
  const code = params.code as string;

  const { data: traceData, isLoading, error } = useQuery({
    queryKey: ["trace", code],
    queryFn: () => api.get(`api/trace/${code}`).json<PublicTrace>(),
    retry: false,
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Trace Code Not Found</h1>
          <p className="text-gray-600">
            The code you scanned is invalid or the product information is no longer available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfaf6] font-sans text-gray-800 selection:bg-green-100 pb-12">
      {/* Header Banner */}
      <div className="bg-green-800 text-white p-8 pb-12 rounded-b-[2rem] shadow-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white to-transparent" />
        <div className="max-w-3xl mx-auto relative z-10 text-center space-y-3">
          <div className="inline-flex items-center justify-center p-3 bg-white/20 rounded-full mb-2 backdrop-blur-sm">
            <Leaf className="w-8 h-8 text-green-100" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Product Journey</h1>
          <p className="text-green-100/90 font-medium">Traceability Report</p>
          <div className="inline-block mt-4 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 font-mono text-sm shadow-inner text-green-50 tracking-wider">
            {traceData.code}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto -mt-6 px-4 space-y-6">
        
        {/* Main Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Batch</h3>
                <p className="text-xl font-medium text-gray-900">{traceData.batch_name || "Standard Batch"}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Variety</h3>
                <p className="text-gray-900 font-medium">{traceData.variety || "Not specified"}</p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Origin Garden</h3>
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
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Harvest Date</h3>
                <div className="flex items-center gap-2 font-medium text-gray-900">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  {traceData.harvest_date ? format(new Date(traceData.harvest_date), "MMMM d, yyyy") : "Not specified"}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Verified True Origin</h3>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 inline-flex font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Authentic source
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Story / Journey */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600" /> Lifecycle Stats
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-900">{traceData.plant_count}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Plants</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-900">{traceData.total_harvested_kg}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Total KG Yield</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <div className="text-2xl font-bold text-gray-900">{traceData.care_reports}</div>
              <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Care Reports</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl text-center">
              <div className="text-sm font-bold text-gray-900 mt-1">
                {traceData.planted_from ? format(new Date(traceData.planted_from), "MMM yyyy") : "-"}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wider">Planted</div>
            </div>
          </div>
        </div>

        {/* Public Info Details */}
        {traceData.public_info && Object.keys(traceData.public_info).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Tractor className="w-5 h-5 text-green-600" /> Additional Details
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
        Powered by AgTech Platform
      </div>
    </div>
  );
}
