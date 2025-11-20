import React, { useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  file: File | null;
  onFileSelect: (file: File) => void;
  onClear: () => void;
  color: 'blue' | 'purple';
}

export const FileUploader: React.FC<FileUploaderProps> = ({ label, file, onFileSelect, onClear, color }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const onInputClick = () => {
      // Reset value to allow selecting the same file again if needed
      if (inputRef.current) {
          inputRef.current.value = '';
      }
  }

  const colorClasses = color === 'blue' 
    ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' 
    : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100';

  return (
    <div className="flex flex-col gap-2 w-full">
      <span className="text-sm font-medium text-slate-600 ml-1">{label}</span>
      {!file ? (
        <label
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${colorClasses}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-2 opacity-60" />
            <p className="text-sm font-medium opacity-80">Kéo thả hoặc chọn file</p>
            <p className="text-xs opacity-60 mt-1">.xlsx, .xls</p>
          </div>
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={handleChange}
            onClick={onInputClick}
          />
        </label>
      ) : (
        <div className={`relative flex items-center p-4 border rounded-xl ${color === 'blue' ? 'bg-white border-blue-100 shadow-sm' : 'bg-white border-purple-100 shadow-sm'}`}>
            <div className={`p-2 rounded-lg mr-3 ${color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                <FileSpreadsheet size={24} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={onClear} className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors">
                <X size={18} />
            </button>
        </div>
      )}
    </div>
  );
};