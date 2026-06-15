import React, { useState, useMemo } from "react";
import { Sparkles, Brain, KanbanSquare, RefreshCw, BarChart2, Table, Eye, HelpCircle } from "lucide-react";
import { Dataset, FilterState } from "./types";
import { parseCSV } from "./utils/dataParser";
import UploadSection from "./components/UploadSection";
import FilterPanel from "./components/FilterPanel";
import VisualizationPanel from "./components/VisualizationPanel";
import AiSummary from "./components/AiSummary";
import DataTable from "./components/DataTable";

// Curated initial sample dataset representing raw CSV layout for instant onboarding
const CURATED_SAMPLE_CSV = `คณะ/หน่วยงาน,ประเภทกิจกรรม,ประเทศ,Partner,งบประมาณ (บาท),วันที่เริ่มต้น
คณะวิทยาศาสตร์,วิจัยและนวัตกรรม,ประเทศญี่ปุ่น,University of Tokyo,2450000,2026-01-15
คณะเทคโนโลยีสารสนเทศ,เปลี่ยนผ่านดิจิทัล,สหรัฐอเมริกา,MIT,3200000,2026-02-10
คณะวิศวกรรมศาสตร์,กระชับความร่วมมือ,ประเทศเยอรมนี,TU Munich,1500000,2026-02-28
คณะแพทยศาสตร์,วิจัยและนวัตกรรม,สหราชอาณาจักร,Oxford University,4500000,2026-03-05
คณะมนุษยศาสตร์,สัมมนาวิชาการ,ประเทศไทย,BU University,850000,2026-04-12
คณะเทคโนโลยีสารสนเทศ,สัมมนาวิชาการ,ประเทศญี่ปุ่น,Kyoto University,1200000,2026-04-20
คณะวิศวกรรมศาสตร์,งานวิจัยนวัตกรรม,สหรัฐอเมริกา,Stanford University,2890000,2026-05-02
คณะแพทยศาสตร์,ฝึกงานแลกเปลี่ยน,สิงคโปร์,NUS University,1800000,2026-05-15
คณะบริหารธุรกิจ,กระชับความร่วมมือ,ฝรั่งเศส,HEC Paris,950000,2026-06-01`;

export default function App() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Initialize initial dataset once on mount using our CURATED_SAMPLE_CSV
  React.useEffect(() => {
    setIsLoading(true);
    parseCSV(CURATED_SAMPLE_CSV.trim(), "ตัวอย่างข้อมูลโครงการร่วมมือมหาวิทยาลัย (Curated Academic Sample)")
      .then((parsed) => {
        setDataset(parsed);
      })
      .catch((err) => console.error("curated sample loaded failure", err))
      .finally(() => setIsLoading(false));
  }, []);

  // Filter state for search queries and range checks
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: "",
    categoricalFilters: {},
    numericFilters: {},
    dateFilters: {},
  });

  // Automatically configure default filters when dataset is updated/replaced (STEP 9)
  const handleDatasetLoaded = (newDataset: Dataset) => {
    const numericInitial: Record<string, any> = {};
    const dateInitial: Record<string, any> = {};

    newDataset.columns.forEach((col) => {
      if (col.type === "Number" && col.min !== undefined && col.max !== undefined) {
        numericInitial[col.name] = {
          min: col.min,
          max: col.max,
          currentMin: col.min,
          currentMax: col.max,
        };
      }
      if (col.type === "Date") {
        dateInitial[col.name] = { start: "", end: "" };
      }
    });

    // Overwrite schema and clear previous filter configurations without website reload
    setDataset(newDataset);
    setFilters({
      searchQuery: "",
      categoricalFilters: {},
      numericFilters: numericInitial,
      dateFilters: dateInitial,
    });
  };

  // Perform dynamic, unified multi-pass filtering on loaded dataset rows
  const filteredRows = useMemo(() => {
    if (!dataset) return [];

    return dataset.rows.filter((row) => {
      // 1. Search filter across all columns
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        const matchesQuery = Object.keys(row).some((key) => {
          const val = row[key];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(query);
        });
        if (!matchesQuery) return false;
      }

      // 2. Multi-choice categorical constraints
      for (const [colName, selectedValues] of Object.entries(filters.categoricalFilters)) {
        if (selectedValues && selectedValues.length > 0) {
          const rowVal = row[colName];
          const valString = rowVal === null || rowVal === undefined ? "" : String(rowVal).trim();
          if (!selectedValues.includes(valString)) {
            return false;
          }
        }
      }

      // 3. Numeric range constraints
      for (const [colName, range] of Object.entries(filters.numericFilters)) {
        const rowVal = row[colName];
        if (rowVal !== undefined && rowVal !== null && String(rowVal).trim() !== "") {
          const numValue = Number(String(rowVal).replace(/[฿\$%,\s]/g, ""));
          if (!isNaN(numValue)) {
            const minBound = range.currentMin ?? range.min;
            const maxBound = range.currentMax ?? range.max;
            if (numValue < minBound || numValue > maxBound) {
              return false;
            }
          }
        }
      }

      // 4. Time/Date boundaries
      for (const [colName, dateRange] of Object.entries(filters.dateFilters)) {
        const rowVal = row[colName];
        if (rowVal && (dateRange.start || dateRange.end)) {
          const rowTime = Date.parse(String(rowVal).trim());
          if (!isNaN(rowTime)) {
            if (dateRange.start) {
              const startTime = Date.parse(dateRange.start);
              if (!isNaN(startTime) && rowTime < startTime) return false;
            }
            if (dateRange.end) {
              const endTime = Date.parse(dateRange.end) + 86400000; // include full day
              if (!isNaN(endTime) && rowTime > endTime) return false;
            }
          }
        }
      }

      return true;
    });
  }, [dataset, filters]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] flex flex-col font-sans transition-all duration-300">
      {/* 👑 Professional Sleek Interface Header */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="bg-[#3b82f6] w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-xs">
            Σ
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
              Dynamic Schema Dashboard
            </h1>
            <p className="text-[10px] text-slate-400 font-medium -mt-0.5">Sleek Interface • Auto-Layout & Automated Type Inference</p>
          </div>
        </div>

        {/* Action controls & Active File Badge */}
        <div className="flex items-center gap-4">
          {dataset && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/60 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium">Active File:</span>
              <strong className="text-slate-700 truncate max-w-[200px]" title={dataset.fileName}>
                {dataset.fileName}
              </strong>
            </div>
          )}
          <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-1 uppercase tracking-wider">
            Auto-Viz Ready
          </div>
        </div>
      </header>

      {/* 💼 Beautiful Dynamic Layout Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* 📑 Left Sidebar: Data Loader & Dynamic Schema Register */}
        <aside className="w-full lg:w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto lg:h-full justify-between">
          <div className="divide-y divide-slate-100">
            {/* Folder Connection & Upload cards */}
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  1. เชื่อมต่อแหล่งข้อมูล
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-sm">
                  Excel / CSV / Cloud
                </span>
              </div>
              
              <UploadSection
                onDatasetLoaded={handleDatasetLoaded}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                currentFileName={dataset?.fileName}
              />
            </div>

            {/* Resolved schema listing (STEPS 1, 2, 3, 6) */}
            {dataset && (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    2. สารบัญโครงสร้างตาราง
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-sm">
                    {dataset.columns.length} Columns
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  ชนิดตัวแปรและข้อมูลกลุ่มที่ตรวจพบจากบรรทัดแรก:
                </p>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {dataset.columns.map((col) => (
                    <div
                      key={col.name}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50/80 border border-transparent hover:border-slate-100 transition-all"
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {/* Beautiful custom badge matching Sleek Layout */}
                        {col.type === "Category" && (
                          <span className="w-5 h-5 rounded-md bg-[#f5f3ff] text-[#8b5cf6] font-bold text-[10px] flex items-center justify-center shrink-0 border border-purple-100" title="Category type">
                            C
                          </span>
                        )}
                        {col.type === "Text" && (
                          <span className="w-5 h-5 rounded-md bg-[#eff6ff] text-[#3b82f6] font-bold text-[10px] flex items-center justify-center shrink-0 border border-blue-100" title="Text type">
                            T
                          </span>
                        )}
                        {col.type === "Number" && (
                          <span className="w-5 h-5 rounded-md bg-[#ecfdf5] text-[#10b981] font-bold text-[10px] flex items-center justify-center shrink-0 border border-emerald-100" title="Numeric type">
                            #
                          </span>
                        )}
                        {col.type === "Date" && (
                          <span className="w-5 h-5 rounded-md bg-[#fff7ed] text-[#f97316] font-bold text-[10px] flex items-center justify-center shrink-0 border border-amber-100" title="Date type">
                            D
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-700 truncate" title={col.name}>
                          {col.name}
                        </span>
                      </div>
                      
                      <div className="flex items-center">
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-sm" title={`${col.uniqueValues.length} unique values found`}>
                          {col.uniqueValues.length}u
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Footer Pipeline Info */}
          <div className="p-4 border-t border-slate-200 bg-[#f8fafc] space-y-2.5 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Processing Pipeline status
            </span>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span>✓ Header Mapping OK</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span>✓ Type Inference OK</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                <span>✓ Auto-Viz Generated</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium animate-pulse">
                <span className="w-1.5 h-1.5 bg-indigo-50500 rounded-full bg-indigo-500"></span>
                <span>✓ Gemini Analyzers Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* 💻 Right Workspace panel: Scrollable preview & analyses */}
        <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 lg:p-8 space-y-6">
          {dataset ? (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* ✨ AI Analysis (Executive summary) */}
              <AiSummary dataset={dataset} filteredRows={filteredRows} />

              {/* Grid of automatic metrics, Interactive filters, dynamic charts */}
              <FilterPanel dataset={dataset} filters={filters} onFiltersChange={setFilters} />

              {/* Dynamic visualizations */}
              <VisualizationPanel dataset={dataset} filteredRows={filteredRows} />

              {/* Data Table */}
              <DataTable dataset={dataset} rows={filteredRows} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-8 text-center max-w-md mx-auto">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs space-y-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto text-xl">
                  📊
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">กำลังเริ่มต้นการประมวลผลข้อมูล...</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ระบบกำลังเซ็ตอัพตัวสุ่มข้อมูลเบื้องต้นเพื่อทดลองใช้งาน หรือสแกนอัปโหลดคอลัมน์จากช่องคลาวด์/ด้านข้างได้ทันที
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// Visual asset subcomponent
function CheckCircleBadge() {
  return (
    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
      <Eye className="w-3 h-3" />
    </div>
  );
}

