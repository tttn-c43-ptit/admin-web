"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { ScanResult } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlantStatusBadge } from "@/components/plant-status-badge";
import { Search, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface TestScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestScanDialog({ open, onOpenChange }: TestScanDialogProps) {
  const [scanCode, setScanCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");

  const { data: scanResult, isLoading, isError, error } = useQuery<ScanResult>({
    queryKey: ["tag_lookup", searchedCode],
    queryFn: () => api.get(`api/tags/lookup/${searchedCode}`).json(),
    enabled: !!searchedCode,
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (scanCode.trim()) {
      setSearchedCode(scanCode.trim());
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Test Scan Tag</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Enter tag code (e.g. QR-001)"
            value={scanCode}
            onChange={(e) => setScanCode(e.target.value)}
            autoFocus
          />
          <Button type="submit" disabled={isLoading || !scanCode.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </form>

        <div className="min-h-[200px] mt-4 border rounded-md p-4 bg-muted/20">
          {isLoading ? (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              Looking up tag...
            </div>
          ) : isError ? (
            <div className="text-center text-red-500 py-8">
              Tag not found or error occurred.
            </div>
          ) : scanResult ? (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{scanResult.plant.code}</h3>
                  <p className="text-sm text-muted-foreground">Tag: {scanResult.tag.tag_code}</p>
                </div>
                <PlantStatusBadge status={scanResult.plant.status} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground block">Garden:</span>
                  {scanResult.garden.name}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground block">Zone:</span>
                  {scanResult.plant.zone_id || "Unassigned"}
                </div>
              </div>

              {scanResult.recent_logs && scanResult.recent_logs.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="font-medium text-sm text-muted-foreground block mb-2">Latest Log:</span>
                  <div className="text-sm">
                    {formatDate(scanResult.recent_logs[0].created_at)} - {scanResult.recent_logs[0].status}
                    {scanResult.recent_logs[0].note && <p className="mt-1">{scanResult.recent_logs[0].note}</p>}
                  </div>
                </div>
              )}

              <Link href={`/plants/${scanResult.plant.id}`} className="block mt-4 w-full">
                <Button className="w-full" onClick={() => onOpenChange(false)}>
                  View Full Details
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-muted-foreground text-sm">
              Enter a tag code above to simulate scanning.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
