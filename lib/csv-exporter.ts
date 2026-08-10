/**
 * Utility to export tabular data to a downloadable CSV file.
 * Adds UTF-8 BOM (\uFEFF) so Microsoft Excel opens Vietnamese text cleanly without font errors.
 */

export interface CSVColumn<T> {
  header: string;
  accessor: (item: T) => string | number | boolean | null | undefined;
}

export function exportToCSV<T>(
  filename: string,
  columns: CSVColumn<T>[],
  data: T[]
): void {
  if (!data || data.length === 0) {
    console.warn("No data available to export.");
    return;
  }

  // Helper to format a single CSV cell
  const formatCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    // If string contains comma, double quotes or newline, wrap in quotes & escape internal quotes
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  // Build CSV content
  const headerRow = columns.map((col) => formatCell(col.header)).join(",");
  const dataRows = data.map((item) =>
    columns.map((col) => formatCell(col.accessor(item))).join(",")
  );

  // Combine headers and rows with UTF-8 BOM prefix
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");

  // Create downloadable Blob
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  // Format date for filename if needed
  const dateStr = new Date().toISOString().slice(0, 10);
  const fullFilename = filename.endsWith(".csv")
    ? filename
    : `${filename}_${dateStr}.csv`;

  link.setAttribute("href", url);
  link.setAttribute("download", fullFilename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
