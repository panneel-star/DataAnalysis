import React, { useState, useRef } from "react";
import { Upload, FileSpreadsheet, Link, AlertCircle, Loader, CheckCircle2 } from "lucide-react";
import { parseExcel, parseCSV, getGoogleSheetsCsvUrl } from "../utils/dataParser";
import { Dataset } from "../types";

interface UploadSectionProps {
  onDatasetLoaded: (dataset: Dataset) => void;
  isLoading: boolean;
  setIsLoading: (val: boolean) => void;
  currentFileName?: string;
}

export default function UploadSection({
  onDatasetLoaded,
  isLoading,
  setIsLoading,
  currentFileName,
}: UploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
        const arrayBuffer = await file.arrayBuffer();
        const dataset = await parseExcel(arrayBuffer, file.name);
        onDatasetLoaded(dataset);
      } else if (file.name.endsWith(".csv") || file.name.endsWith(".txt")) {
        const text = await file.text();
        const dataset = await parseCSV(text, file.name);
        onDatasetLoaded(dataset);
      } else {
        throw new Error("รองรับเฉพาะไฟล์ Excel (.xlsx, .xls) หรือ CSV (.csv) เท่านั้น");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "เกิดข้อผิดพลาดในการโหลดไฟล์");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleSheetUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sheetUrl.trim()) return;

    setIsLoading(true);
    setErrorMessage("");
    try {
      const csvUrl = getGoogleSheetsCsvUrl(sheetUrl.trim());
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(
          "ไม่สามารถดึงข้อมูลจาก Google Sheet ได้ กรุณาแชร์สิทธิ์เป็น 'ทุกคนที่มีลิงก์สามารถดูได้' (Anyone with link can view)"
        );
      }
      const text = await response.text();
      const dataset = await parseCSV(text, "Google Sheet Dynamic Link");
      onDatasetLoaded(dataset);
      setSheetUrl("");
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || "เกิดข้อผิดพลาดในการดึงข้อมูล Google Sheet แนะนำให้ตรวจสอบว่าแชร์ไฟล์แล้วหรือยัง"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-100 p-6 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-500" />
            เชื่อมต่อข้อมูลและสร้างแดชบอร์ดอัตโนมัติ
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            อัปโหลดไฟล์ Excel, CSV หรือวางลิงก์ Google Sheet เพื่อสแกนคอลัมน์ ตรวจชนิดข้อมูลตัวแปร และสร้าง Visualization ทันที
          </p>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-indigo-500 bg-indigo-50/40"
              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
          }`}
          id="upload-dropzone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xls,.csv,.txt"
            className="hidden"
            id="upload-file-input"
          />

          <div className="flex flex-col items-center justify-center space-y-3">
            <div className={`p-4 rounded-full ${dragActive ? "bg-indigo-100/50 text-indigo-600" : "bg-slate-100 text-slate-400"}`}>
              <Upload className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-700">
                ลากและวางไฟล์ หรือ <span className="text-indigo-600 hover:underline">คลิกเพื่อเลือกไฟล์</span>
              </p>
              <p className="text-xs text-slate-400">
                รองรับไฟล์ Excel (.xlsx, .xls) หรือ CSV ขนาดทั่วไป
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <span className="relative px-3 text-xs uppercase font-medium bg-white text-slate-400">หรือใช้ลิงก์คลาวด์</span>
        </div>

        {/* Google Sheet URL form */}
        <form onSubmit={handleSheetUrlSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Link className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="url"
              placeholder="วาง Google Sheet URL (เช่น https://docs.google.com/spreadsheets/d/...)"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              id="sheet-url-input"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !sheetUrl.trim()}
            className="px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 transition-colors flex items-center justify-center gap-2"
            id="sheet-submit-btn"
          >
            {isLoading ? <Loader className="w-4 h-4 animate-spin" /> : "ดึงข้อมูลแถวบน"}
          </button>
        </form>

        {/* Status Indicators / Errors */}
        {isLoading && (
          <div className="flex items-center justify-center gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl">
            <Loader className="w-5 h-5 text-indigo-500 animate-spin" />
            <span className="text-sm font-medium text-slate-600">กำลังสแกนโครงสร้างคอลัมน์และประมวลผลข้อมูล...</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl" id="upload-error">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">การเชื่อมต่อผิดพลาด</p>
              <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {currentFileName && !isLoading && (
          <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl" id="upload-success">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">
                  กำลังใช้งานโครงสร้างข้อมูลไฟล์ปัจจุบัน
                </p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  คอลัมน์ถูกดึงแยกตามเซกเมนต์และพร้อมสร้างวิชวลจาก {currentFileName}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
