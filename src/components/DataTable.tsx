import React, { useState, useMemo } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, ServerCrash } from "lucide-react";
import { Dataset } from "../types";

interface DataTableProps {
  dataset: Dataset;
  rows: Record<string, any>[];
}

export default function DataTable({ dataset, rows }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);

  // Reset page when dataset or rows list changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [dataset, rows]);

  // Handle column header sorting
  const handleSort = (columnName: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === columnName && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key: columnName, direction });
  };

  const sortedRows = useMemo(() => {
    if (!sortConfig) return rows;

    const { key, direction } = sortConfig;
    const sorted = [...rows].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];

      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;

      // Check if they are numbers
      const numA = Number(String(aVal).replace(/[฿\$%,\s]/g, ""));
      const numB = Number(String(bVal).replace(/[฿\$%,\s]/g, ""));

      if (!isNaN(numA) && !isNaN(numB)) {
        return direction === "asc" ? numA - numB : numB - numA;
      }

      // Default string compare
      const strA = String(aVal).trim().toLowerCase();
      const strB = String(bVal).trim().toLowerCase();

      return direction === "asc"
        ? strA.localeCompare(strB, "th", { sensitivity: "base" })
        : strB.localeCompare(strA, "th", { sensitivity: "base" });
    });

    return sorted;
  }, [rows, sortConfig]);

  // Partition current page records
  const totalRowsCount = sortedRows.length;
  const totalPages = Math.ceil(totalRowsCount / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = useMemo(() => {
    return sortedRows.slice(startIndex, startIndex + pageSize);
  }, [sortedRows, startIndex, pageSize]);

  // Export current filtered rows to CSV
  const exportToCSV = () => {
    if (rows.length === 0) return;
    const headers = dataset.columns.map((c) => c.name);
    const csvRows = [
      headers.join(","), // header row
      ...rows.map((row) =>
        headers
          .map((header) => {
            const val = row[header] !== undefined && row[header] !== null ? String(row[header]) : "";
            // escape quotes and commas
            const escaped = val.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `filtered_dashboard_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 md:p-6 space-y-4" id="data-table-wrapper">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h4 className="font-bold text-slate-800 text-base">ตารางประมวผลข้อมูลสุทธิ (Filtered Data Table)</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            สแกนคอลัมน์อัตโนมัติ แสดงผลแถวทั้งหมดจำนวน {rows.length.toLocaleString()} แถว (เรียงและกรองได้อิสระ)
          </p>
        </div>
        
        {rows.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-white bg-slate-100 hover:bg-slate-900 border border-slate-200 hover:border-slate-800 rounded-lg px-3 py-2 transition-all cursor-pointer"
            id="btn-export-csv"
          >
            <Download className="w-3.5 h-3.5" />
            ดาวน์โหลดผลลัพธ์ (.csv)
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
          <ServerCrash className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-500">ไม่พบแถวข้อมูลตามตัวกรองที่เลือก</p>
          <p className="text-xs text-slate-400 mt-0.5">กรุณาล้างหรือปรับขนาดของตัวกรองในแถบเครื่องมือหลัก</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Scrollable grid panel */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-110">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
              <thead className="bg-slate-50 sticky top-0 font-bold text-slate-600 uppercase tracking-wide select-none z-10">
                <tr>
                  {dataset.columns.map((col) => {
                    const isSorted = sortConfig?.key === col.name;
                    return (
                      <th
                        key={col.name}
                        onClick={() => handleSort(col.name)}
                        className="px-4 py-3.5 hover:bg-slate-100/80 cursor-pointer transition-colors max-w-[200px]"
                      >
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="truncate" title={col.name}>{col.name}</span>
                          <ArrowUpDown className={`w-3 h-3 text-slate-400 shrink-0 ${isSorted ? "text-indigo-600 scale-110" : ""}`} />
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 text-slate-700">
                {paginatedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {dataset.columns.map((col) => {
                      const rawVal = row[col.name];
                      const valStr = rawVal === null || rawVal === undefined ? "" : String(rawVal);
                      return (
                        <td key={col.name} className="px-4 py-3 truncate max-w-[200px]" title={valStr}>
                          {col.type === "Number" && !isNaN(Number(valStr.replace(/[฿\$%,\s]/g, ""))) ? (
                            <span className="font-mono bg-indigo-50/30 text-indigo-700 px-1.5 py-0.5 rounded-sm">
                              {Number(valStr.replace(/[฿\$%,\s]/g, "")).toLocaleString()}
                            </span>
                          ) : col.type === "Date" ? (
                            <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-sm">📅 {valStr}</span>
                          ) : (
                            valStr || <span className="text-slate-300 italic">(ว่าง)</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">แสดงผลแถวต่อหน้า:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="text-xs bg-white border border-slate-200 rounded-lg p-1"
                id="select-page-size"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-xs text-slate-400 ml-2">
                แสดงลำดับที่ {(startIndex + 1).toLocaleString()} - {Math.min(startIndex + pageSize, totalRowsCount).toLocaleString()} จาก {totalRowsCount.toLocaleString()} แถว
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(c - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                id="btn-prev-page"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-xs font-semibold text-slate-700 px-2">
                หน้า {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(c + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                id="btn-next-page"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
