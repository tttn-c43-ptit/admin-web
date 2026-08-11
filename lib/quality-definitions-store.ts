export interface QualityGrade {
  id: string;
  name: string;
  isDefault?: boolean;
}

export const DEFAULT_QUALITY_GRADES: QualityGrade[] = [
  { id: "g-1", name: "Loại 1 (Xuất khẩu)", isDefault: true },
  { id: "g-2", name: "Loại 2 (Tiêu chuẩn)", isDefault: true },
  { id: "g-3", name: "Loại 3 (Chế biến)", isDefault: true },
  { id: "g-a", name: "Loại A", isDefault: true },
  { id: "g-b", name: "Loại B", isDefault: true },
  { id: "g-c", name: "Loại C", isDefault: true },
  { id: "g-xo", name: "Hàng xô / Chợ", isDefault: true },
];

const STORAGE_KEY = "plant_care_quality_grades";

export function getQualityGrades(gardenId?: string): QualityGrade[] {
  if (typeof window === "undefined") return DEFAULT_QUALITY_GRADES;

  try {
    const key = gardenId ? `${STORAGE_KEY}_${gardenId}` : STORAGE_KEY;
    const stored = localStorage.getItem(key);
    if (!stored) {
      const globalStored = localStorage.getItem(STORAGE_KEY);
      if (globalStored) {
        return JSON.parse(globalStored);
      }
      return DEFAULT_QUALITY_GRADES;
    }
    const customList: QualityGrade[] = JSON.parse(stored);
    return customList;
  } catch (err) {
    return DEFAULT_QUALITY_GRADES;
  }
}

export function saveQualityGrades(grades: QualityGrade[], gardenId?: string): void {
  if (typeof window === "undefined") return;

  try {
    const key = gardenId ? `${STORAGE_KEY}_${gardenId}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(grades));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grades));
  } catch (err) {
    console.error("Failed to save quality grades", err);
  }
}

export function addQualityGrade(name: string, gardenId?: string): QualityGrade[] {
  const current = getQualityGrades(gardenId);
  const trimmed = name.trim();
  if (!trimmed) return current;

  if (current.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
    return current;
  }

  const newGrade: QualityGrade = {
    id: `custom-${Date.now()}`,
    name: trimmed,
    isDefault: false,
  };

  const updated = [...current, newGrade];
  saveQualityGrades(updated, gardenId);
  return updated;
}

export function removeQualityGrade(id: string, gardenId?: string): QualityGrade[] {
  const current = getQualityGrades(gardenId);
  const updated = current.filter((g) => g.id !== id);
  saveQualityGrades(updated, gardenId);
  return updated;
}
