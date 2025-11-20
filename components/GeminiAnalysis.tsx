import React, { useState } from 'react';
import { Sparkles, Loader2, Bot } from 'lucide-react';
import { ComparisonResult } from '../types';
import { analyzeChangesWithGemini } from '../services/geminiService';

interface GeminiAnalysisProps {
  comparison: ComparisonResult;
}

export const GeminiAnalysis: React.FC<GeminiAnalysisProps> = ({ comparison }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeChangesWithGemini(comparison);
      setAnalysis(result);
    } catch (err) {
      setError("Không thể kết nối với AI. Vui lòng kiểm tra API Key và thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!comparison.summary.modifiedRows && !comparison.summary.addedRows && !comparison.summary.removedRows) {
    return null;
  }

  return (
    <div className="mt-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 overflow-hidden">
      <div className="p-5 border-b border-indigo-100/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Sparkles size={20} />
          </div>
          <h3 className="font-semibold text-indigo-900">Phân tích Thông minh</h3>
        </div>
        {!analysis && !loading && (
          <button
            onClick={handleAnalyze}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm hover:shadow-md active:scale-95"
          >
            <Bot size={16} />
            Phân tích với Gemini
          </button>
        )}
      </div>

      {loading && (
        <div className="p-8 flex flex-col items-center justify-center text-indigo-600">
          <Loader2 size={32} className="animate-spin mb-3" />
          <p className="text-sm font-medium animate-pulse">Đang đọc dữ liệu và phân tích...</p>
        </div>
      )}

      {error && (
        <div className="p-6 text-red-600 text-sm bg-red-50">
          {error}
        </div>
      )}

      {analysis && !loading && (
        <div className="p-6">
           <div className="prose prose-indigo prose-sm max-w-none text-slate-700">
             <div className="whitespace-pre-line leading-relaxed font-medium">
                {analysis}
             </div>
           </div>
           <div className="mt-4 pt-4 border-t border-indigo-100 flex justify-end">
             <button 
                onClick={() => setAnalysis(null)}
                className="text-xs text-indigo-400 hover:text-indigo-600 font-medium"
             >
                Đóng phân tích
             </button>
           </div>
        </div>
      )}
    </div>
  );
};
