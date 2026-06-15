import React, { useState } from "react";
import { Filter, RotateCcw, ChevronDown, ChevronUp, Search, Calendar, Hash, Check } from "lucide-react";
import { Dataset, FilterState, ColumnSchema } from "../types";

interface FilterPanelProps {
  dataset: Dataset;
  filters: FilterState;
  onFiltersChange: (next: FilterState) => void;
}

export default function FilterPanel({ dataset, filters, onFiltersChange }: FilterPanelProps) {
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});

  const toggleCollapse = (colName: string) => {
    setCollapsedCols((prev) => ({ ...prev, [colName]: !prev[colName] }));
  };

  const handleSearchChange = (val: string) => {
    onFiltersChange({
      ...filters,
      searchQuery: val,
    });
  };

  const handleCategoricalCheck = (colName: string, value: string, checked: boolean) => {
    const currentList = filters.categoricalFilters[colName] || [];
    let nextList: string[];
    if (checked) {
      nextList = [...currentList, value];
    } else {
      nextList = currentList.filter((v) => v !== value);
    }

    onFiltersChange({
      ...filters,
      categoricalFilters: {
        ...filters.categoricalFilters,
        [colName]: nextList,
      },
    });
  };

  const handleNumericRangeChange = (colName: string, key: "currentMin" | "currentMax", value: number) => {
    const defaultRange = filters.numericFilters[colName] || { min: 0, max: 100 };
    onFiltersChange({
      ...filters,
      numericFilters: {
        ...filters.numericFilters,
        [colName]: {
          ...defaultRange,
          [key]: value,
        },
      },
    });
  };

  const handleDateRangeChange = (colName: string, key: "start" | "end", value: string) => {
    const defaultRange = filters.dateFilters[colName] || { start: "", end: "" };
    onFiltersChange({
      ...filters,
      dateFilters: {
        ...filters.dateFilters,
        [colName]: {
          ...defaultRange,
          [key]: value,
        },
      },
    });
  };

  const resetFilters = () => {
    const numericReset: Record<string, any> = {};
    const dateReset: Record<string, any> = {};

    dataset.columns.forEach((col) => {
      if (col.type === "Number" && col.min !== undefined && col.max !== undefined) {
        numericReset[col.name] = { min: col.min, max: col.max, currentMin: col.min, currentMax: col.max };
      }
      if (col.type === "Date") {
        dateReset[col.name] = { start: "", end: "" };
      }
    });

    onFiltersChange({
      searchQuery: "",
      categoricalFilters: {},
      numericFilters: numericReset,
      dateFilters: dateReset,
    });
  };

  // Group columns for cleaner layout
  const categoricalCols = dataset.columns.filter((c) => c.type === "Category");
  const numericCols = dataset.columns.filter((c) => c.type === "Number");
  const dateCols = dataset.columns.filter((c) => c.type === "Date");
  const textCols = dataset.columns.filter((c) => c.type === "Text");

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 md:p-6" id="filter-panel">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800 text-lg">ตัวกรองแดชบอร์ดอัตโนมัติ</h3>
        </div>
        <button
          onClick={resetFilters}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-100 rounded-lg px-3 py-1.5 transition-colors"
          id="btn-reset-filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          ล้างตัวกรองทั้งหมด
        </button>
      </div>

      <div className="space-y-6">
        {/* Universal Text Search across all columns */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" />ค้นหาด่วน (Search Data)
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="ค้นหาข้อความใดๆ ในทุกคอลัมน์..."
              value={filters.searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-3 pr-10 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
              id="global-search-input"
            />
            {filters.searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                เคลียร์
              </button>
            )}
          </div>
        </div>

        {/* Categorical Columns Filters */}
        {categoricalCols.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">หมวดหมู่และกลุ่มข้อมูล (Category Filters)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoricalCols.map((col) => {
                const checkedList = filters.categoricalFilters[col.name] || [];
                const isCollapsed = collapsedCols[col.name] ?? false;
                
                return (
                  <div key={col.name} className="border border-slate-100 rounded-xl p-3 bg-slate-50/30">
                    <button
                      onClick={() => toggleCollapse(col.name)}
                      className="flex items-center justify-between w-full text-left font-medium text-slate-700 text-sm focus:outline-hidden"
                    >
                      <span className="truncate pr-2 font-semibold">
                        📂 {col.name}
                        {checkedList.length > 0 && (
                          <span className="ml-1.5 text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                            {checkedList.length}
                          </span>
                        )}
                      </span>
                      {isCollapsed ? <ChevronDown className="w-4 h-4 shrink-0 text-slate-400" /> : <ChevronUp className="w-4 h-4 shrink-0 text-slate-400" />}
                    </button>

                    {!isCollapsed && (
                      <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {col.uniqueValues.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">ไม่มีข้อมูลกลุ่มเด่น</span>
                        ) : (
                          col.uniqueValues.map((val) => {
                            const isChecked = checkedList.includes(val);
                            return (
                              <label key={val} className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 hover:text-slate-900 select-none">
                                <input
                                  type="checkbox"
                                  className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                                  checked={isChecked}
                                  onChange={(e) => handleCategoricalCheck(col.name, val, e.target.checked)}
                                />
                                <span className="truncate">{val || "(ว่างเปล่า)"}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Numeric Columns Filters */}
        {numericCols.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Hash className="w-3.5 h-3.5" /> ช่วงตัวเลขและมูลค่า (Numeric Filters)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {numericCols.map((col) => {
                const range = filters.numericFilters[col.name] || { min: 0, max: 100, currentMin: 0, currentMax: 100 };
                const cMin = range.currentMin ?? range.min;
                const cMax = range.currentMax ?? range.max;

                return (
                  <div key={col.name} className="border border-slate-100 rounded-xl p-4 bg-slate-50/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700 truncate pr-2">📊 {col.name}</span>
                      <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">
                        {cMin.toLocaleString()} - {cMax.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-8">มิน:</span>
                        <input
                          type="range"
                          min={col.min ?? 0}
                          max={col.max ?? 100}
                          value={cMin}
                          onChange={(e) => handleNumericRangeChange(col.name, "currentMin", Number(e.target.value))}
                          className="w-full cursor-pointer accent-indigo-600"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 w-8">แมกซ์:</span>
                        <input
                          type="range"
                          min={col.min ?? 0}
                          max={col.max ?? 100}
                          value={cMax}
                          onChange={(e) => handleNumericRangeChange(col.name, "currentMax", Number(e.target.value))}
                          className="w-full cursor-pointer accent-indigo-400"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Date Columns Filters */}
        {dateCols.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> ช่วงเวลาที่ตรวจสอบ (Date Filters)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dateCols.map((col) => {
                const range = filters.dateFilters[col.name] || { start: "", end: "" };

                return (
                  <div key={col.name} className="border border-slate-100 rounded-xl p-3 bg-slate-50/20 space-y-2">
                    <span className="text-sm font-semibold text-slate-700 truncate block">📅 {col.name}</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">เริ่มต้น</span>
                        <input
                          type="date"
                          value={range.start}
                          onChange={(e) => handleDateRangeChange(col.name, "start", e.target.value)}
                          className="w-full text-xs p-1.5 border border-slate-200 rounded-md focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-0.5">สิ้นสุด</span>
                        <input
                          type="date"
                          value={range.end}
                          onChange={(e) => handleDateRangeChange(col.name, "end", e.target.value)}
                          className="w-full text-xs p-1.5 border border-slate-200 rounded-md focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
