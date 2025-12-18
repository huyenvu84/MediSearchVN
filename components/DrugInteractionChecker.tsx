import React, { useState, useEffect } from 'react';
import { Pill, AlertTriangle, X, Search, Loader2, CheckCircle2, ImageOff, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { checkDrugInteractions } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialDrugs?: string;
}

const DrugInteractionChecker: React.FC<Props> = ({ isOpen, onClose, initialDrugs }) => {
  const [drugs, setDrugs] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync initialDrugs when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialDrugs) {
        setDrugs(initialDrugs);
        setResult(null); // Reset result for new check
      } else {
        setDrugs(''); // Clear if opened empty
        setResult(null);
      }
    }
  }, [isOpen, initialDrugs]);

  if (!isOpen) return null;

  const handleCheck = async () => {
    if (!drugs.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const data = await checkDrugInteractions(drugs);
      setResult(data);
    } catch (error) {
      const errorMessage = `> **Đã xảy ra lỗi**
> 
> Không thể hoàn thành yêu cầu. Vui lòng kiểm tra lại danh sách thuốc hoặc thử lại sau.`;
      setResult(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-scale-in border dark:border-slate-700">
        
        {/* Header */}
        <div className="bg-medical-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Pill className="w-6 h-6" />
            <h2 className="text-xl font-bold">Tra cứu Tương tác Thuốc</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Nhập danh sách thuốc (ngăn cách bằng dấu phẩy):
            </label>
            <div className="relative">
              <textarea
                value={drugs}
                onChange={(e) => setDrugs(e.target.value)}
                placeholder="Ví dụ: Aspirin, Warfarin, Metformin..."
                className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-medical-400 dark:focus:ring-medical-500 focus:border-medical-500 dark:focus:border-medical-500 min-h-[100px] text-gray-800 dark:text-slate-200 bg-white dark:bg-slate-800 resize-none"
              />
              <button
                onClick={handleCheck}
                disabled={isLoading || !drugs.trim()}
                className="absolute bottom-3 right-3 bg-medical-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-medical-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-sm"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Kiểm tra
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-2 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Sử dụng cơ sở dữ liệu y khoa chuẩn để phân tích tương tác.
            </p>
          </div>

          {/* Result Area */}
          {result && (
            <div className="border-t border-gray-100 dark:border-slate-800 pt-6 animate-fade-in-up">
              <div className="markdown-content">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                >
                  {result}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {!result && !isLoading && (
            <div className="text-center py-12 text-gray-400 dark:text-slate-600">
              <Pill className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>Nhập tên các loại thuốc để bắt đầu kiểm tra tương tác.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 dark:bg-slate-800/50 p-4 border-t border-gray-200 dark:border-slate-800 flex items-start gap-3 text-sm text-gray-500 dark:text-slate-400">
           <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
           <p className="text-xs">
             Kết quả chỉ mang tính chất tham khảo. Vui lòng tham vấn ý kiến chuyên môn.
           </p>
        </div>
      </div>
    </div>
  );
};

export default DrugInteractionChecker;