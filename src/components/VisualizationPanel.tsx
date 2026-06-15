import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { BarChart3, PieChartIcon, TrendingUp, HelpCircle, Activity, Landmark, Percent } from "lucide-react";
import { Dataset } from "../types";

interface VisualizationPanelProps {
  dataset: Dataset;
  filteredRows: Record<string, any>[];
}

// Gorgeous palette matching professional slate/royal themes
const CHART_COLORS = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#06b6d4", // Cyan
  "#f43f5e", // Rose
  "#14b8a6", // Teal
  "#84cc16", // Lime
];

export default function VisualizationPanel({ dataset, filteredRows }: VisualizationPanelProps) {
  const { columns } = dataset;

  // Derive column classifications
  const categoryCols = useMemo(() => columns.filter((c) => c.type === "Category"), [columns]);
  const numberCols = useMemo(() => columns.filter((c) => c.type === "Number"), [columns]);
  const dateCols = useMemo(() => columns.filter((c) => c.type === "Date"), [columns]);

  // UI Selection State
  const [selectedCatCol, setSelectedCatCol] = useState<string>(categoryCols[0]?.name || "");
  const [selectedNumCol, setSelectedNumCol] = useState<string>("__count__"); // "__count__" is record frequencyCount
  const [selectedDateCol, setSelectedDateCol] = useState<string>(dateCols[0]?.name || "");
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");

  // Auto fallback sync if dataset/file changes
  React.useEffect(() => {
    if (categoryCols.length > 0 && !categoryCols.find((c) => c.name === selectedCatCol)) {
      setSelectedCatCol(categoryCols[0].name);
    }
    if (dateCols.length > 0 && !dateCols.find((d) => d.name === selectedDateCol)) {
      setSelectedDateCol(dateCols[0].name);
    }
  }, [categoryCols, dateCols, selectedCatCol, selectedDateCol]);

  // 1. Calculate KPI Values based on Filtered Rows
  const kpis = useMemo(() => {
    if (filteredRows.length === 0) return [];

    return numberCols.map((col) => {
      // Clean numeric values
      const vals = filteredRows
        .map((r) => {
          const val = r[col.name];
          if (val === null || val === undefined || String(val).trim() === "") return NaN;
          return Number(String(val).replace(/[฿\$%,\s]/g, ""));
        })
        .filter((v) => !isNaN(v));

      const count = vals.length;
      const sum = vals.reduce((acc, curr) => acc + curr, 0);
      const avg = count > 0 ? sum / count : 0;
      const max = count > 0 ? Math.max(...vals) : 0;
      const min = count > 0 ? Math.min(...vals) : 0;

      return {
        colName: col.name,
        sum,
        avg,
        max,
        min,
        count,
      };
    });
  }, [numberCols, filteredRows]);

  // 2. Compute Distribution Data for Selected Categorical vs Selected Numeric
  const categoricalChartData = useMemo(() => {
    if (!selectedCatCol || filteredRows.length === 0) return [];

    const grouped: Record<string, { label: string; value: number }> = {};

    filteredRows.forEach((row) => {
      const rawCat = row[selectedCatCol];
      const catKey = rawCat === undefined || rawCat === null || String(rawCat).trim() === "" ? "(ว่าง)" : String(rawCat).trim();

      // Aggregate depending on parameter
      let addVal = 1;
      if (selectedNumCol !== "__count__") {
        const rawNum = row[selectedNumCol];
        const numVal = rawNum !== undefined && rawNum !== null ? Number(String(rawNum).replace(/[฿\$%,\s]/g, "")) : 0;
        addVal = isNaN(numVal) ? 0 : numVal;
      }

      if (!grouped[catKey]) {
        grouped[catKey] = { label: catKey, value: 0 };
      }
      grouped[catKey].value += addVal;
    });

    // Format and sort by aggregate value
    return Object.values(grouped).sort((a, b) => b.value - a.value).slice(0, 15); // limit top 15 categories for neat charts
  }, [selectedCatCol, selectedNumCol, filteredRows]);

  // 3. Compute Timeline Data for Selected Date Column
  const dateChartData = useMemo(() => {
    if (!selectedDateCol || filteredRows.length === 0) return [];

    const grouped: Record<string, { rawDate: string; label: string; count: number; sumMetric: number }> = {};

    filteredRows.forEach((row) => {
      const rawDateStr = row[selectedDateCol];
      if (!rawDateStr) return;

      // Extract Year-Month or simple date as group key
      let dateKey = "(ว่าง)";
      try {
        const d = new Date(rawDateStr);
        if (!isNaN(d.getTime())) {
          // format YYYY-MM
          const month = String(d.getMonth() + 1).padStart(2, "0");
          dateKey = `${d.getFullYear()}-${month}`;
        } else {
          // If native parse fails, slice regular string elements
          const cleanStr = String(rawDateStr).trim();
          dateKey = cleanStr.length > 7 ? cleanStr.substring(0, 7) : cleanStr;
        }
      } catch {
        dateKey = String(rawDateStr).substring(0, 7);
      }

      let metricVal = 1;
      if (selectedNumCol !== "__count__") {
        const rawNum = row[selectedNumCol];
        const numVal = rawNum !== undefined && rawNum !== null ? Number(String(rawNum).replace(/[฿\$%,\s]/g, "")) : 0;
        metricVal = isNaN(numVal) ? 0 : metricVal;
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = { rawDate: dateKey, label: dateKey, count: 0, sumMetric: 0 };
      }
      grouped[dateKey].count += 1;
      grouped[dateKey].sumMetric += metricVal;
    });

    // Sort chronologically
    return Object.values(grouped).sort((a, b) => a.rawDate.localeCompare(b.rawDate));
  }, [selectedDateCol, selectedNumCol, filteredRows]);

  return (
    <div className="space-y-6" id="visualization-panel">
      {/* 📊 KPI / Summary Cards */}
      <div>
        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          ตัวชี้วัดสรุปข้อมูล (Automatic Key Performance Indicators)
        </h4>

        {kpis.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium">รายการข้อมูลทั้งหมด (Total Rows)</span>
                <span className="text-2xl font-bold font-display text-slate-800">{filteredRows.length.toLocaleString()}</span>
                <span className="text-xs text-slate-400 block mt-0.5">คอร์เร็กต์ฟิลเตอร์แถวใช้งาน</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs flex items-center gap-4">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-xl">
                <Percent className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium font-display">จำนวนคอลัมน์ (Detected Columns)</span>
                <span className="text-2xl font-bold text-slate-800">{columns.length}</span>
                <span className="text-xs text-slate-400 block mt-0.5">ประเภทข้อมูลหลากหลาย</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Standard Total row KPI */}
            <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">รายการข้อมูลสุทธิ (Filtered Records)</span>
              <span className="text-3xl font-bold font-display text-slate-800 block mt-1">{filteredRows.length.toLocaleString()}</span>
              <span className="text-xs text-slate-400 block mt-1">แถวประมวลผลอยู่ / {dataset.rowCount.toLocaleString()} แถวทั้งหมด</span>
            </div>

            {/* Numeric Cols aggregate KPIs */}
            {kpis.map((kpi) => (
              <div key={kpi.colName} className="bg-white rounded-xl border border-indigo-50/50 p-5 shadow-xs space-y-2">
                <div className="border-b border-slate-50 pb-1.5">
                  <span className="text-xs font-bold text-indigo-600 truncate block">🔢 {kpi.colName}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-50/50 rounded-sm p-1">
                    <span className="text-[9px] text-slate-400 block">ค่ารวม (Sum)</span>
                    <span className="text-sm font-bold text-slate-800 block truncate" title={kpi.sum.toLocaleString()}>
                      {kpi.sum > 1000000 ? `${(kpi.sum / 1000000).toFixed(2)}M` : kpi.sum.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50/50 rounded-sm p-1">
                    <span className="text-[9px] text-slate-400 block">ค่าเฉลี่ย (Avg)</span>
                    <span className="text-sm font-bold text-slate-800 block truncate" title={kpi.avg.toLocaleString()}>
                      {kpi.avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    </span>
                  </div>
                  <div className="bg-slate-50/50 rounded-sm p-1">
                    <span className="text-[9px] text-slate-400 block">สูงสุด (Max)</span>
                    <span className="text-xs font-bold text-slate-700 block truncate">
                      {kpi.max > 1000000 ? `${(kpi.max / 1000000).toFixed(1)}M` : kpi.max.toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-slate-50/50 rounded-sm p-1">
                    <span className="text-[9px] text-slate-400 block font-display">ต่ำสุด (Min)</span>
                    <span className="text-xs font-bold text-slate-700 block truncate">{kpi.min.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 📈 Dynamic Chart Generator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Box (1/3 weight) */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-5 shadow-xs">
          <div>
            <h5 className="font-bold text-slate-800 text-sm">กำหนดมิติวิชวลไรซ์ตามคอลัมน์</h5>
            <p className="text-xs text-slate-400 mt-0.5">เลือกคอลัมน์และค่าการวัดเพื่อประกอบกราฟเปรียบเทียบข้อมูล</p>
          </div>

          {/* Categorical select */}
          {categoryCols.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                คอลัมน์ตัวแปรกลุ่มเด่น (Category Dim)
              </label>
              <select
                value={selectedCatCol}
                onChange={(e) => setSelectedCatCol(e.target.value)}
                className="block w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                id="select-cat-col"
              >
                {categoryCols.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} (Category)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Numeric aggregation select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">
              ค่าการวัด / ค่ารวมตัวเลข (Metric Aggregate)
            </label>
            <select
              value={selectedNumCol}
              onChange={(e) => setSelectedNumCol(e.target.value)}
              className="block w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              id="select-num-col"
            >
              <option value="__count__">จำนวนรายการข้อมูลทั้งหมด (Record Count)</option>
              {numberCols.map((col) => (
                <option key={col.name} value={col.name}>
                  ผลรวมของ: {col.name} (Sum)
                </option>
              ))}
            </select>
          </div>

          {/* Date Axis select */}
          {dateCols.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                คอลัมน์วันที่แกนเวลา (Date Axis)
              </label>
              <select
                value={selectedDateCol}
                onChange={(e) => setSelectedDateCol(e.target.value)}
                className="block w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                id="select-date-col"
              >
                {dateCols.map((col) => (
                  <option key={col.name} value={col.name}>
                    {col.name} (Date)
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Pie / Bar charting */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500">รูปแบบกราฟวิเคราะห์หมวดหมู่</label>
            <div className="grid grid-cols-2 gap-2 text-center">
              <button
                onClick={() => setChartType("bar")}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  chartType === "bar"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
                id="btn-chart-bar"
              >
                กราฟแท่ง (Bar Chart)
              </button>
              <button
                onClick={() => setChartType("pie")}
                className={`py-1.5 text-xs font-medium rounded-lg border transition-all ${
                  chartType === "pie"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
                id="btn-chart-pie"
              >
                กราฟวงกลม (Pie Chart)
              </button>
            </div>
          </div>
        </div>

        {/* Chart displays (2/3 weight) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 space-y-8 shadow-xs flex flex-col justify-between">
          {/* Section 1: Categories Aggregate Graphic */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  สัดส่วนหมวดหมู่: {selectedCatCol || "ไม่มีคอลัมน์กลุ่ม"}
                </h5>
                <p className="text-xs text-slate-400">
                  สกัดค่าตาม: {selectedNumCol === "__count__" ? "จำนวนรายการความถี่" : `ผลรวม ${selectedNumCol}`} (แสดง 15 หมวดหมู่แรกยอดสูงสุด)
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              {categoricalChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <HelpCircle className="w-4 h-4" /> แผนภูมิจะแสดงเมื่อพบข้อมูลชนิดคอลัมน์ Category หรือถูกสุ่มพาร์ท
                  </span>
                </div>
              ) : chartType === "bar" ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoricalChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, borderColor: "#e2e8f0" }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                      {categoricalChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoricalChartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name.substring(0, 8)} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                    >
                      {categoricalChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Section 2: Date Timeline Area Graphic */}
          {dateCols.length > 0 && (
            <div className="border-t border-slate-100 pt-5 space-y-3">
              <div>
                <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  แนวโน้มแกนเวลา (Data Count Timeline): {selectedDateCol}
                </h5>
                <p className="text-xs text-slate-400">
                  สัดส่วนแนวโน้มข้อมูลจำแนกตามรายปี-เดือน (Monthly Historical Timeline Trends)
                </p>
              </div>

              <div className="h-56 w-full">
                {dateChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-slate-50">
                    <span className="text-xs text-slate-400 italic">ไม่มีข้อมูลแสดงผล มิติแกนเวลาว่าง</span>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dateChartData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Area
                        type="monotone"
                        dataKey={selectedNumCol === "__count__" ? "count" : "sumMetric"}
                        name={selectedNumCol === "__count__" ? "จำนวนรายการ" : "ผลรวมเทียบเวลา"}
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorValue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
