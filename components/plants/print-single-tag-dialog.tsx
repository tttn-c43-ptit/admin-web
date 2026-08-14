"use client";

import { useState } from "react";
import { Plant } from "@/types";
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
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet, Image as PdfImage } from "@react-pdf/renderer";
import { Loader2 } from "lucide-react";

interface PrintSingleTagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plant: Plant;
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

const TagDocument = ({ plant, format, tagImage }: { plant: Plant; format: "QR" | "BARCODE"; tagImage: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.tagBox}>
        {tagImage && (
          <PdfImage
            src={tagImage}
            style={format === "QR" ? styles.qrImage : styles.barcodeImage}
          />
        )}
        <Text style={styles.codeText}>{plant.code}</Text>
      </View>
    </Page>
  </Document>
);

export function PrintSingleTagDialog({ open, onOpenChange, plant }: PrintSingleTagDialogProps) {
  const [format, setFormat] = useState<"QR" | "BARCODE">("QR");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tagImage, setTagImage] = useState<string>("");
  const [isReady, setIsReady] = useState(false);

  const handlePrepare = async () => {
    setIsGenerating(true);
    setIsReady(false);

    try {
      const image = await generateTagImage(plant.code, format);
      setTagImage(image);
      setIsReady(true);
    } catch (error) {
      console.error("Failed to generate tag", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Print Tag for {plant.code}</DialogTitle>
          <DialogDescription>
            Generate a PDF document containing the QR code or barcode for this plant.
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
              <Button
                type="button"
                onClick={handlePrepare}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Prepare PDF
              </Button>
            ) : (
              <PDFDownloadLink
                document={<TagDocument plant={plant} format={format} tagImage={tagImage} />}
                fileName={`plant-${plant.code}-tag.pdf`}
              >
                {/* @ts-expect-error type missing react-pdf */}
                {({ loading }: unknown) => (
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
