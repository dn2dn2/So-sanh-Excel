import React, { useState } from 'react';
import { ComparisonResult } from '../types';
import { CheckCircle, ZoomIn, ZoomOut } from 'lucide-react';

interface ComparisonTableProps {
  data: ComparisonResult;
  fileOldName?: string;
  sheetOldName?: string;
  fileNewName?: string;
  sheetNewName?: string;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ 
  data,
  fileOldName = "File Cũ",
  sheetOldName = "Sheet 1",
  fileNewName = "File Mới",
  sheetNewName = "Sheet 1"
}) => {
  const [filter, setFilter] = useState<'all' | 'diff'>('diff');
  const [zoomLevel, setZoomLevel] = useState<number>(100); // Range: 30% to 200%

  const filteredRows = filter === 'diff' 
    ? data.rows.filter(r => r.status !== 'same') 
    : data.rows;

  // Define styles based on extended zoom level
  const getZoomStyles = () => {
      // --- ULTRA COMPACT (Bird's eye view) ---
      if (zoomLevel <= 40) return { 
          text: 'text-[9px] leading-3', 
          headText: 'text-[9px]', 
          p: 'px-0.5 py-0.5', 
          minW: 'min-w-[40px]', 
          rowH: 'h-4',
          showText: false // Optional: could hide text entirely at lowest zoom, but let's keep it tiny
      };
      
      // --- COMPACT ---
      if (zoomLevel <= 60) return { 
          text: 'text-[10px] leading-tight', 
          headText: 'text-[10px]', 
          p: 'px-1 py-0.5', 
          minW: 'min-w-[60px]', 
          rowH: 'h-6' 
      };
      
      // --- SMALL ---
      if (zoomLevel <= 80) return { 
          text: 'text-xs', 
          headText: 'text-[11px]', 
          p: 'p-1.5', 
          minW: 'min-w-[90px]', 
          rowH: 'h-8' 
      };
      
      // --- NORMAL ---
      if (zoomLevel <= 110) return { 
          text: 'text-sm', 
          headText: 'text-xs', 
          p: 'p-2', 
          minW: 'min-w-[120px]', 
          rowH: '' 
      };
      
      // --- LARGE ---
      if (zoomLevel <= 150) return { 
          text: 'text-base', 
          headText: 'text-sm', 
          p: 'p-3', 
          minW: 'min-w-[160px]', 
          rowH: 'h-12' 
      };

      // --- EXTRA LARGE ---
      return { 
          text: 'text-lg', 
          headText: 'text-base', 
          p: 'p-4', 
          minW: 'min-w-[200px]', 
          rowH: 'h-14' 
      };
  };

  const styles = getZoomStyles();

  const handleZoomIn = () => {
      setZoomLevel(prev => Math.min(prev + 10, 200)); // Max 200%
  };

  const handleZoomOut = () => {
      setZoomLevel(prev => Math.max(prev - 10, 30)); // Min 30%
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-lg font-semibold text-slate-800 hidden md:block">Chi tiết so sánh</h2>
            
            {/* Filter Controls */}
            <div className="flex bg-slate-100 p-1 rounded-lg">
                <button 
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Tất cả
                </button>
                <button 
                    onClick={() => setFilter('diff')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-all ${filter === 'diff' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Chỉ thay đổi
                </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-2 ml-2 pl-4 border-l border-slate-200">
                <button 
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 30}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-30 active:bg-slate-200"
                    title="Thu nhỏ tối đa"
                >
                    <ZoomOut size={18} />
                </button>
                <span className="text-xs font-mono w-11 text-center text-slate-600 select-none">{zoomLevel}%</span>
                <button 
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 200}
                    className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500 disabled:opacity-30 active:bg-slate-200"
                    title="Phóng to tối đa"
                >
                    <ZoomIn size={18} />
                </button>
            </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-medium text-slate-600 hidden lg:flex">
             <div className="flex items-center gap-1 px-2 py-1 rounded bg-red-50 border border-red-100">
                 <span className="w-2 h-2 rounded-full bg-red-500"></span> Đã xóa
             </div>
             <div className="flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-100">
                 <span className="w-2 h-2 rounded-full bg-green-500"></span> Mới thêm
             </div>
             <div className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-50 border border-yellow-100">
                 <span className="w-2 h-2 rounded-full bg-yellow-500"></span> Sai khác
             </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar relative bg-slate-50/50">
        <table className="w-full text-left border-collapse border-spacing-0">
          <thead className="sticky top-0 z-10 shadow-sm">
            {/* Parent Headers */}
            <tr className="bg-slate-100 border-b border-slate-200">
                <th className="w-8 bg-slate-100 border-r border-slate-200"></th>
                <th className="w-8 bg-slate-100 border-r border-slate-200"></th>
                
                {/* Left Side Header */}
                <th colSpan={data.headers.length} className={`py-1 px-2 text-center border-r border-slate-300 bg-blue-50/50 text-blue-800 font-semibold ${styles.text}`}>
                    {fileOldName} <span className="font-normal opacity-70 mx-1">/</span> {sheetOldName}
                </th>

                {/* Separator Column Header */}
                <th className="w-2 bg-slate-200 border-l border-r border-slate-300"></th>

                {/* Right Side Header */}
                <th colSpan={data.headers.length} className={`py-1 px-2 text-center bg-purple-50/50 text-purple-800 font-semibold ${styles.text}`}>
                    {fileNewName} <span className="font-normal opacity-70 mx-1">/</span> {sheetNewName}
                </th>
            </tr>
            
            {/* Column Headers */}
            <tr className="bg-white">
              <th className={`${styles.p} ${styles.headText} font-bold text-slate-500 border-b border-r border-slate-200 text-center w-8`} title="Dòng File Cũ">Cũ</th>
              <th className={`${styles.p} ${styles.headText} font-bold text-slate-500 border-b border-r border-slate-200 text-center w-8`} title="Dòng File Mới">Mới</th>
              
              {/* Old File Columns */}
              {data.headers.map((header) => (
                <th key={`old-${header}`} className={`${styles.p} ${styles.headText} font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 ${styles.minW} bg-blue-50/10 truncate`}>
                  {header}
                </th>
              ))}

              {/* Separator */}
              <th className="w-2 bg-slate-100 border-l border-r border-slate-200 border-b"></th>

              {/* New File Columns */}
              {data.headers.map((header) => (
                <th key={`new-${header}`} className={`${styles.p} ${styles.headText} font-bold text-slate-500 uppercase tracking-wider border-b border-r border-slate-100 ${styles.minW} bg-purple-50/10 truncate`}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredRows.length === 0 ? (
               <tr>
                 <td colSpan={data.headers.length * 2 + 3} className="p-12 text-center text-slate-400">
                   <div className="flex flex-col items-center justify-center">
                     <CheckCircle className="w-12 h-12 mb-3 text-green-500 opacity-20" />
                     <p>Không tìm thấy dữ liệu thay đổi nào</p>
                   </div>
                 </td>
               </tr>
            ) : (
                filteredRows.map((row) => (
                <tr key={row.id} className={`hover:bg-slate-50/80 transition-colors group ${styles.rowH}`}>
                    {/* Old Row Index */}
                    <td className={`${styles.p} ${styles.text} font-mono text-slate-400 text-center border-r border-slate-200 select-none bg-slate-50`}>
                        {row.oldRowNumber || "-"}
                    </td>
                    {/* New Row Index */}
                    <td className={`${styles.p} ${styles.text} font-mono text-slate-400 text-center border-r border-slate-200 select-none bg-slate-50`}>
                        {row.newRowNumber || "-"}
                    </td>

                    {/* --- OLD DATA SIDE --- */}
                    {data.headers.map((header) => {
                        const cell = row.cells[header];
                        
                        // 1. Row Added (Present in New, Missing in Old) -> Empty/Hatch Left
                        if (row.status === 'added') {
                            return <td key={`old-${header}`} className={`${styles.p} border-r border-slate-100 bg-slate-50/30`}>
                                <div className="w-full h-full min-h-[12px] bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,#e2e8f0_4px,#e2e8f0_5px)] opacity-50"></div>
                            </td>;
                        }

                        // 2. Row Removed or Modified/Same
                        const displayValue = row.status === 'removed' ? cell.value : cell.oldValue;
                        
                        let cellClass = `${styles.p} ${styles.text} border-r border-slate-100 truncate max-w-[200px] `;
                        if (row.status === 'removed') {
                            cellClass += "bg-red-50 text-red-800 decoration-red-300 line-through";
                        } else if (cell.status === 'modified') {
                            cellClass += "bg-yellow-50 text-yellow-800 font-medium";
                        } else {
                            cellClass += "text-slate-500";
                        }

                        return (
                            <td key={`old-${header}`} className={cellClass} title={String(displayValue)}>
                                {String(displayValue !== undefined ? displayValue : "")}
                            </td>
                        );
                    })}

                    {/* --- SEPARATOR --- */}
                    <td className="w-2 bg-slate-100 border-l border-r border-slate-200"></td>

                    {/* --- NEW DATA SIDE --- */}
                    {data.headers.map((header) => {
                        const cell = row.cells[header];
                        
                        // 1. Row Removed (Present in Old, Missing in New) -> Empty/Hatch Right
                        if (row.status === 'removed') {
                            return <td key={`new-${header}`} className={`${styles.p} border-r border-slate-100 bg-slate-50/30`}>
                                 <div className="w-full h-full min-h-[12px] bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,#e2e8f0_4px,#e2e8f0_5px)] opacity-50"></div>
                            </td>;
                        }

                        const displayValue = cell.value;

                        let cellClass = `${styles.p} ${styles.text} border-r border-slate-100 truncate max-w-[200px] `;
                        if (row.status === 'added') {
                            cellClass += "bg-green-50 text-green-800 font-medium";
                        } else if (cell.status === 'modified') {
                            cellClass += "bg-yellow-50 text-yellow-800 font-medium";
                        } else {
                            cellClass += "text-slate-800";
                        }

                        return (
                            <td key={`new-${header}`} className={cellClass} title={String(displayValue)}>
                                {String(displayValue !== undefined ? displayValue : "")}
                            </td>
                        );
                    })}

                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};