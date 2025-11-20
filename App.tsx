import React, { useState } from 'react';
import { FileUploader } from './components/FileUploader';
import { ComparisonTable } from './components/ComparisonTable';
import { GeminiAnalysis } from './components/GeminiAnalysis';
import { readExcelWorkbook, getSheetData, compareExcelData, WorkbookData, exportComparisonToExcel } from './services/excelUtils';
import { ComparisonResult } from './types';
import { GitCompare, AlertTriangle, RefreshCcw, BarChart3, Layers, Download } from 'lucide-react';

function App() {
  // State for storing raw workbooks and metadata
  const [wbOld, setWbOld] = useState<WorkbookData | null>(null);
  const [wbNew, setWbNew] = useState<WorkbookData | null>(null);
  
  // State for selected sheets
  const [selectedSheetOld, setSelectedSheetOld] = useState<string>('');
  const [selectedSheetNew, setSelectedSheetNew] = useState<string>('');

  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handlers for file uploads
  const handleOldFileSelect = async (file: File) => {
      try {
          setLoading(true);
          const data = await readExcelWorkbook(file);
          setWbOld(data);
          setSelectedSheetOld(data.sheetNames[0]); // Default to first sheet
          setError(null);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleNewFileSelect = async (file: File) => {
      try {
          setLoading(true);
          const data = await readExcelWorkbook(file);
          setWbNew(data);
          setSelectedSheetNew(data.sheetNames[0]); // Default to first sheet
          setError(null);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
  };

  const handleCompare = async () => {
    if (!wbOld || !wbNew) return;

    setLoading(true);
    setError(null);
    setComparison(null);

    try {
      // Get data for selected sheets
      const dataOld = getSheetData(wbOld.workbook, selectedSheetOld);
      const dataNew = getSheetData(wbNew.workbook, selectedSheetNew);

      // Compare
      const result = compareExcelData(dataOld, dataNew);
      setComparison(result);
    } catch (err: any) {
      console.error("Comparison error:", err);
      setError(err.message || "Đã xảy ra lỗi không xác định khi xử lý file.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
      if (comparison) {
          try {
              exportComparisonToExcel(comparison);
          } catch (err) {
              console.error(err);
              setError("Không thể xuất file Excel.");
          }
      }
  }

  const handleReset = () => {
    setWbOld(null);
    setWbNew(null);
    setSelectedSheetOld('');
    setSelectedSheetNew('');
    setComparison(null);
    setError(null);
  };

  // Helper to create a fake File object for the Uploader UI to show "Selected" state
  const getFileObj = (wb: WorkbookData | null) => wb ? { name: wb.fileName, size: 0 } as File : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Area - Click to Reset */}
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={handleReset}
            title="Về trang chủ"
          >
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
              <GitCompare size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Excel<span className="text-indigo-600">Diff</span> Pro</h1>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-4">
             {comparison ? (
                 <div className="flex gap-3">
                    <button 
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-all shadow-sm shadow-green-200"
                    >
                        <Download size={16} />
                        <span className="hidden sm:inline">Xuất Báo cáo</span>
                    </button>
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 transition-all border border-slate-200 shadow-sm"
                    >
                        <RefreshCcw size={16} />
                        <span className="hidden sm:inline">So sánh khác</span>
                    </button>
                 </div>
             ) : (
                 <div className="text-sm text-slate-500 font-medium hidden sm:block">
                    Công cụ so sánh dữ liệu tự động
                 </div>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Input Section */}
        {!comparison ? (
          <div className="max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-800 mb-3">Bắt đầu so sánh</h2>
              <p className="text-slate-500">Tải lên file gốc và file mới, chọn sheet cần so sánh.</p>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                {/* Connecting Line for Desktop */}
                <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                   <div className="bg-slate-100 p-2 rounded-full border border-slate-200">
                      <ArrowRightIcon className="text-slate-400" />
                   </div>
                </div>

                {/* File 1 */}
                <div className="flex flex-col gap-3 relative z-10">
                    <FileUploader 
                        label="1. File Gốc (Phiên bản cũ)" 
                        file={getFileObj(wbOld)} 
                        onFileSelect={handleOldFileSelect} 
                        onClear={() => { setWbOld(null); setSelectedSheetOld(''); }}
                        color="blue"
                    />
                    {wbOld && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Chọn Sheet để so sánh</label>
                            <div className="relative">
                                <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select 
                                    value={selectedSheetOld}
                                    onChange={(e) => setSelectedSheetOld(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-slate-700"
                                >
                                    {wbOld.sheetNames.map(sheet => (
                                        <option key={sheet} value={sheet}>{sheet}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                {/* File 2 */}
                <div className="flex flex-col gap-3 relative z-10">
                    <FileUploader 
                        label="2. File Mới (Phiên bản mới)" 
                        file={getFileObj(wbNew)} 
                        onFileSelect={handleNewFileSelect} 
                        onClear={() => { setWbNew(null); setSelectedSheetNew(''); }}
                        color="purple"
                    />
                    {wbNew && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">Chọn Sheet để so sánh</label>
                            <div className="relative">
                                <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select 
                                    value={selectedSheetNew}
                                    onChange={(e) => setSelectedSheetNew(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-slate-700"
                                >
                                    {wbNew.sheetNames.map(sheet => (
                                        <option key={sheet} value={sheet}>{sheet}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                </div>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700 text-sm animate-pulse">
                  <AlertTriangle size={20} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleCompare}
                  disabled={!wbOld || !wbNew || loading}
                  className={`
                    flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold shadow-lg transition-all transform active:scale-95
                    ${(!wbOld || !wbNew) 
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-indigo-200 shadow-indigo-200'}
                  `}
                >
                  {loading ? (
                    <>
                      <RefreshCcw className="animate-spin" size={20} />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      So sánh ngay
                      <GitCompare size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Result View */
          <div className="flex flex-col h-[calc(100vh-140px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
               <StatCard label="Tổng số dòng" value={comparison.summary.totalRows} color="slate" icon={<BarChart3 size={20} />} />
               <StatCard label="Dòng mới thêm" value={comparison.summary.addedRows} color="green" icon={<div className="w-2 h-2 rounded-full bg-green-500" />} />
               <StatCard label="Dòng đã xóa" value={comparison.summary.removedRows} color="red" icon={<div className="w-2 h-2 rounded-full bg-red-500" />} />
               <StatCard label="Dòng bị thay đổi" value={comparison.summary.modifiedRows} color="yellow" icon={<div className="w-2 h-2 rounded-full bg-yellow-500" />} />
            </div>
            
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-1 gap-6">
                {/* Main Table - Takes up full width for Side-by-Side view */}
                <div className="flex flex-col min-h-0 h-full">
                    <ComparisonTable 
                        data={comparison} 
                        fileOldName={wbOld?.fileName}
                        sheetOldName={selectedSheetOld}
                        fileNewName={wbNew?.fileName}
                        sheetNewName={selectedSheetNew}
                    />
                </div>
            </div>
            
            {/* Analysis Section at bottom */}
            <div className="lg:w-2/3 mx-auto w-full pb-12">
                 <GeminiAnalysis comparison={comparison} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const ArrowRightIcon = ({ className }: { className?: string }) => (
    <svg className={`w-6 h-6 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
);

const StatCard = ({ label, value, color, icon }: { label: string, value: number, color: 'green' | 'red' | 'yellow' | 'slate', icon: React.ReactNode }) => {
    const bgColors = {
        slate: 'bg-white border-slate-200',
        green: 'bg-green-50 border-green-100 text-green-900',
        red: 'bg-red-50 border-red-100 text-red-900',
        yellow: 'bg-yellow-50 border-yellow-100 text-yellow-900',
    };

    return (
        <div className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between ${bgColors[color]}`}>
            <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</p>
                <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
            <div className="opacity-80">{icon}</div>
        </div>
    );
}

export default App;