import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { Sparkles, Loader, AlertTriangle, RefreshCw } from "lucide-react";
import { Dataset } from "../types";

interface AiSummaryProps {
  dataset: Dataset;
  filteredRows: Record<string, any>[];
}

export default function AiSummary({ dataset, filteredRows }: AiSummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorInstance, setErrorInstance] = useState<string>("");

  const triggerAnalysis = async () => {
    if (!dataset || filteredRows.length === 0) return;
    setLoading(true);
    setErrorInstance("");

    try {
      // Package metadata & subset samples securely for server side analysis
      const schemaPayload = dataset.columns.reduce((acc, col) => {
        acc[col.name] = {
          type: col.type,
          uniqueCount: col.uniqueValues.length,
          min: col.min,
          max: col.max,
        };
        return acc;
      }, {} as Record<string, any>);

      const body = {
        schema: schemaPayload,
        sampleData: filteredRows.slice(0, 10),
        rowCount: filteredRows.length,
      };

      const res = await fetch("/api/gemini-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "การเชื่อมต่อขัดข้อง" }));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setSummary(data.summary || "ไม่พบหัวข้อวิเคราะห์จาก AI ลองกดสแกนใหม่อีกครั้ง");
    } catch (err: any) {
      console.error("AI Summary failure:", err);
      setErrorInstance(err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ AI");
    } finally {
      setLoading(false);
    }
  };

  // Re-trigger analysis when file or filter contents change significantly
  useEffect(() => {
    triggerAnalysis();
  }, [dataset.fileName]); // Trigger on file swap. Can trigger on button press to save tokens if filters change.

  return (
    <div className="bg-gradient-to-r from-[#f0f9ff] to-[#e0f2fe] rounded-2xl border border-[#bae6fd] p-5 md:p-6 space-y-4" id="ai-summary-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="text-xl mt-0.5 select-none animate-bounce">
            ✨
          </div>
          <div>
            <h3 className="font-bold text-[#0369a1] text-base">สรุปผลบทวิเคราะห์ด้วยระบบ AI อัตโนมัติ (AI Summary Analysis)</h3>
            <p className="text-xs text-[#0284c7] font-medium">สกัดคุณลักษณะ สัดส่วนกลุ่มข้อมูลเด่น และแนวโน้มอย่างแม่นยำด้วยโมเดล Gemini</p>
          </div>
        </div>

        <button
          onClick={triggerAnalysis}
          disabled={loading || filteredRows.length === 0}
          className="flex items-center gap-1.5 text-xs font-bold text-[#0369a1] bg-white/95 hover:bg-white border border-[#bae6fd] rounded-lg px-3.5 py-2 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
          id="btn-trigger-ai-analysis"
        >
          {loading ? <Loader className="w-3.5 h-3.5 animate-spin text-[#0369a1]" /> : <RefreshCw className="w-3.5 h-3.5 text-[#0369a1]" />}
          คำนวณผลสรุปใหม่ (Recalculate AI)
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-white/75 rounded-xl border border-dashed border-[#bae6fd]">
          <Loader className="w-6 h-6 text-[#0284c7] animate-spin" />
          <div className="text-center">
            <p className="text-xs font-semibold text-[#0369a1]">กำลังเชื่อมต่อ Generative AI โมเดล gemini-3.5-flash...</p>
            <p className="text-[11px] text-slate-400 mt-0.5">กำลังประเมินโครงสร้าง Metadata และประมวลคำตอบสังเคราะห์</p>
          </div>
        </div>
      ) : errorInstance ? (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl" id="ai-error-indicator">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">ไม่สามารถสร้างบทวิเคราะห์ได้</p>
            <p className="text-xs text-amber-600 mt-1">{errorInstance}</p>
            <p className="text-[11.5px] text-slate-500 mt-2">
              คำแนะนำ: ตรวจสอบและตั้งค่า <b className="text-slate-700">GEMINI_API_KEY</b> ในเมนู <b className="text-slate-700">Settings &gt; Secrets</b> ด้านบนขวาเพื่อให้ระบบ AI ทำงานสมบูรณ์
            </p>
          </div>
        </div>
      ) : summary ? (
        <div className="bg-white/90 backdrop-blur-xs rounded-xl shadow-xs border border-white/60 p-5 md:p-6 text-[#1e293b]">
          <div className="markdown-body text-slate-700 text-xs sm:text-sm leading-relaxed prose max-w-none space-y-4 prose-headings:font-bold prose-h3:text-[#0369a1] prose-h3:text-sm prose-h3:mt-3 prose-p:my-2 prose-ul:list-disc prose-ul:pl-5">
            <Markdown>{summary}</Markdown>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-[#0284c7] text-xs italic">
          ยังไม่มีข้อมูลสรุป กรุณากดปุ่ม "คำนวณผลสรุปใหม่" เพื่อเริ่มประมวลผลสรุปจากข้อมูลชุดนี้
        </div>
      )}
    </div>
  );
}
