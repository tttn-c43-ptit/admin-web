"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  QualityGrade,
  getQualityGrades,
  addQualityGrade,
  removeQualityGrade,
} from "@/lib/quality-definitions-store";
import { Plus, Trash2, Tag, Check, Award } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/components/i18n-provider";

interface QualityManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gardenId?: string;
  onUpdated?: () => void;
}

export function QualityManagementDialog({
  open,
  onOpenChange,
  gardenId,
  onUpdated,
}: QualityManagementDialogProps) {
  const { t } = useTranslation();
  const [grades, setGrades] = useState<QualityGrade[]>([]);
  const [newGradeName, setNewGradeName] = useState("");

  useEffect(() => {
    if (open) {
      setGrades(getQualityGrades(gardenId));
      setNewGradeName("");
    }
  }, [open, gardenId]);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newGradeName.trim()) return;

    if (grades.some((g) => g.name.toLowerCase() === newGradeName.trim().toLowerCase())) {
      toast.error(t("quality.existsError") || "Phân loại chất lượng này đã tồn tại!");
      return;
    }

    const updated = addQualityGrade(newGradeName, gardenId);
    setGrades(updated);
    setNewGradeName("");
    toast.success(t("quality.addSuccess") || "Đã thêm phân loại chất lượng mới thành công!");
    if (onUpdated) onUpdated();
  };

  const handleRemove = (id: string, name: string) => {
    const updated = removeQualityGrade(id, gardenId);
    setGrades(updated);
    toast.success(`${t("quality.removeSuccess") || "Đã xóa"} "${name}"`);
    if (onUpdated) onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader className="border-b pb-3">
          <DialogTitle className="flex items-center gap-2 text-emerald-800 text-lg">
            <Award className="h-5 w-5 text-emerald-600" />
            {t("quality.dialogTitle") || "Quản Lý Phân Loại Chất Lượng Sản Phẩm"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            {t("quality.dialogSub") ||
              "Định nghĩa trước các tiêu chuẩn chất lượng (ví dụ: Loại 1, Loại 2, Loại A...) để nhân viên chọn thống nhất khi thu hoạch."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {/* Form thêm mới phân loại */}
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <Input
              placeholder={t("quality.inputPlaceholder") || "VD: Loại Thượng Hạng, Loại D..."}
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              className="flex-1 text-sm"
            />
            <Button type="submit" size="sm" className="bg-emerald-700 hover:bg-emerald-800 text-white shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              {t("action.add") || "Thêm mới"}
            </Button>
          </form>

          {/* Danh sách phân loại hiện có */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("quality.currentGrades") || "Danh sách chất lượng khả dụng:"}
            </div>

            <div className="grid grid-cols-1 gap-2">
              {grades.map((grade) => (
                <div
                  key={grade.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-medium text-foreground">{grade.name}</span>
                    {grade.isDefault && (
                      <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                        {t("quality.defaultBadge") || "Mặc định"}
                      </Badge>
                    )}
                  </div>

                  {!grade.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemove(grade.id, grade.name)}
                      title={t("action.delete") || "Xóa"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              <Check className="h-4 w-4 mr-1 text-emerald-600" />
              {t("action.close") || "Hoàn tất"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
