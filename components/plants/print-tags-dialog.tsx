"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient as api } from "@/lib/api-client";
import { PaginatedResponse, Plant } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
// @ts-ignore
import QRCode from "qrcode";
// @ts-ignore
import JsBarcode from "jsbarcode";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image as PdfImage } from "@react-pdf/renderer";
import { Loader2 } from "lucide-react";

interface PrintTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId: string;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    justifyContent: "flex-start",
  },
  tagBox: {
    width: "30%",
    margin: "1.5%",
    padding: 10,
    border: "1pt solid #ccc",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  codeText: {
    fontSize: 10,
    marginTop: 5,
    fontFamily: "Helvetica-Bold",
  },
  qrImage: {
    width: 100,
    height: 100,
  },
  barcodeImage: {
    width: 120,
    height: 40,
  },
});

const generateTagImage = async (code: string, format: "QR" | "BARCODE"): Promise<string> => {
  if (format === "QR") {
    return QRCode.toDataURL(code, { width: 200, margin: 1 });
  } else {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, code, {
        format: "CODE128",
        width: 2,
        height: 50,
        displayValue: false,
      });
      resolve(canvas.toDataURL("image/png"));
    });
  }
};

const TagDocument = ({ plants, format, tagImages }: { plants: Plant[]; format: "QR" | "BARCODE"; tagImages: Record<string, string> }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {plants.map((plant) => (
        <View key={plant.id} style={styles.tagBox}>
          {tagImages[plant.code] && (
            <PdfImage
              src={tagImages[plant.code]}
              style={format === "QR" ? styles.qrImage : styles.barcodeImage}
            />
          )}
          <Text style={styles.codeText}>{plant.code}</Text>
        </View>
      ))}
    </Page>
  </Document>
);

export function PrintTagsDialog({ open, onOpenChange, gardenId }: PrintTagsDialogProps) {
  const [format, setFormat] = useState<"QR" | "BARCODE">("QR");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tagImages, setTagImages] = useState<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);

  const { data, isLoading } = useQuery<PaginatedResponse<Plant>>({
    queryKey: ["plants", gardenId],
    queryFn: () => api.get(`api/gardens/${gardenId}/plants?limit=500`).json(),
    enabled: open && !!gardenId,
  });

  const handlePrepare = async () => {
    if (!data?.items) return;
    setIsGenerating(true);
    setIsReady(false);

    try {
      const images: Record<string, string> = {};
      for (const plant of data.items) {
        images[plant.code] = await generateTagImage(plant.code, format);
      }
      setTagImages(images);
      setIsReady(true);
    } catch (error) {
      console.error("Failed to generate tags", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Print Plant Tags</DialogTitle>
          <DialogDescription>
            Generate a PDF document containing QR codes or barcodes for all plants in this garden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={format} onValueChange={(v) => v && setFormat(v as "QR" | "BARCODE")}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="QR">QR Code</SelectItem>
                <SelectItem value="BARCODE">Barcode</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            
            {!isReady ? (
              <Button onClick={handlePrepare} disabled={isGenerating || isLoading}>
                {isGenerating || isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Prepare PDF
              </Button>
            ) : (
              <PDFDownloadLink
                document={<TagDocument plants={data?.items || []} format={format} tagImages={tagImages} />}
                fileName={`garden-${gardenId}-tags.pdf`}
              >
                {/* @ts-ignore */}
                {({ loading }: any) => (
                  <Button disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Download PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
