import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { SearchResult } from '../types';
import { 
  BookOpen, ExternalLink, Link2, Copy, Check, StickyNote, Save, 
  WifiOff, Loader2, Download, BookmarkCheck,
  Maximize2, X, ImageIcon, Printer, FileDown, ImageOff,
  FileText, Monitor, Smartphone
} from 'lucide-react';

interface Props {
  title: string;
  data: SearchResult;
  initialNote: string;
  onSaveNote: (note: string) => void;
  isOffline?: boolean;
  isSavedOffline: boolean;
  onToggleOfflineSave: () => void;
}

type Tab = 'protocol' | 'notes' | 'sources';

const SearchResultDisplay: React.FC<Props> = ({ 
  title,
  data, 
  initialNote, 
  onSaveNote, 
  isOffline,
  isSavedOffline,
  onToggleOfflineSave
}) => {
  const [copied, setCopied] = React.useState(false);
  const [note, setNote] = useState(initialNote);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('protocol');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isPdfOptionsOpen, setIsPdfOptionsOpen] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({ format: 'a4', orientation: 'portrait' });
  
  useEffect(() => {
    setNote(initialNote || '');
    setIsSaved(false);
    setActiveTab('protocol'); 
  }, [initialNote, data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(data.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNoteClick = () => {
    onSaveNote(note);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleConfirmExportPDF = () => {
    if (isExportingPDF) return;
    setIsPdfOptionsOpen(false);
    handleExportPDF(pdfOptions.format, pdfOptions.orientation);
  };

  const handleExportPDF = async (format: string, orientation: string) => {
    if (!(window as any).html2pdf) {
      alert("Chức năng đang tải thư viện. Vui lòng thử lại sau giây lát.");
      return;
    }

    setIsExportingPDF(true);
    let container: HTMLElement | null = null;
    
    const widthMap: { [key: string]: number } = {
      'a4-portrait': 720,
      'a4-landscape': 1050,
      'a5-portrait': 480,
      'a5-landscape': 720,
    };
    const key = `${format}-${orientation}`;
    const renderWidth = widthMap[key] || 720;

    try {
      const element = document.querySelector('.print-only');
      if (!element) {
        throw new Error("Không tìm thấy nội dung để xuất.");
      }

      const clone = element.cloneNode(true) as HTMLElement;
      clone.classList.add('pdf-export-container');
      clone.classList.remove('hidden');
      clone.classList.remove('print-only');
      
      clone.style.display = 'block';
      clone.style.width = `${renderWidth}px`;
      clone.style.maxWidth = `${renderWidth}px`;
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.style.background = 'white';
      
      const images = clone.querySelectorAll('img');
      const imagePromises: Promise<void>[] = [];

      images.forEach((img) => {
        img.style.maxWidth = "100%";
        img.style.height = "auto";
        img.style.display = "block";
        img.style.pageBreakInside = "avoid";
        
        const src = img.getAttribute('src');
        if (src) {
           const promise = new Promise<void>((resolve) => {
               const tmpImg = new Image();
               tmpImg.onload = () => resolve();
               tmpImg.onerror = () => resolve();
               tmpImg.src = src;
           });
           imagePromises.push(promise);
        }
      });

      if (imagePromises.length > 0) {
          await Promise.all(imagePromises);
      }

      container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.top = '0';
      container.style.left = '0';
      container.style.zIndex = '-9999';
      container.style.width = `${renderWidth}px`;
      container.style.overflow = 'visible';
      container.appendChild(clone);
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 500));

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `PhacDo_${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        enableLinks: false, 
        html2canvas: { 
          scale: 2,
          useCORS: true, 
          logging: false, 
          scrollY: 0,
          windowWidth: renderWidth,
        }, 
        jsPDF: { 
            unit: 'mm', 
            format: format, 
            orientation: orientation 
        },
        pagebreak: { 
            mode: ['css', 'legacy'],
            avoid: ['tr', 'img', 'h1', 'h2', 'h3']
        } 
      };

      await (window as any).html2pdf().set(opt).from(clone).save();

    } catch (err: any) {
      console.error("PDF Export Error:", err);
      alert("Đã xảy ra lỗi khi tạo PDF. Vui lòng thử lại hoặc sử dụng tính năng 'In' (Ctrl+P) để lưu dưới dạng PDF.");
    } finally {
      if (container && document.body.contains(container)) {
        document.body.removeChild(container);
      }
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const TabButton = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 border-b-2 transition-colors ${
        activeTab === id
          ? 'border-medical-600 text-medical-700 dark:text-medical-400 bg-medical-50/50 dark:bg-slate-800'
          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/50'
      }`}
    >
      <Icon className={`w-4 h-4 ${activeTab === id ? 'text-medical-600 dark:text-medical-400' : ''}`} />
      {label}
    </button>
  );

  return (
    <div className="pb-20 relative">
      {/* Offline Banner */}
      {isOffline && (
        <div className="mb-6 no-print">
          <div className="bg-gray-100 dark:bg-slate-800 border-l-4 border-gray-500 dark:border-slate-600 p-3 md:p-4 rounded-r-lg flex items-center shadow-sm">
            <WifiOff className="h-5 w-5 text-gray-500 dark:text-slate-400 mr-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Chế độ Offline</p>
              <p className="text-xs text-gray-500 dark:text-slate-400">Bạn đang xem dữ liệu lưu trữ. Kết nối mạng để cập nhật.</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden bg-white dark:bg-slate-900 rounded-t-xl border-b border-gray-200 dark:border-slate-800 flex sticky top-14 z-40 shadow-sm mb-4 mx-[-1rem] px-4 sm:mx-0 sm:px-0 sm:rounded-xl overflow-hidden no-print">
        <TabButton id="protocol" label="Phác đồ" icon={BookOpen} />
        <TabButton id="notes" label="Ghi chú" icon={StickyNote} />
        <TabButton id="sources" label="Nguồn" icon={Link2} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        
        {/* Main Content - Protocol */}
        <div className={`lg:col-span-8 space-y-6 ${activeTab !== 'protocol' ? 'hidden lg:block' : ''}`}>
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-medical-600" />
                Nội dung phác đồ
              </h2>
              
              <div className="flex items-center justify-end gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
                 {/* Save Offline Button */}
                 <button
                  onClick={onToggleOfflineSave}
                  className={`flex-1 sm:flex-none justify-center flex items-center gap-1.5 text-xs md:text-sm font-medium px-3 py-2 rounded-lg transition-colors border whitespace-nowrap ${
                    isSavedOffline
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700 hover:bg-indigo-200 dark:hover:bg-indigo-900/60'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-medical-600'
                  }`}
                  title={isSavedOffline ? "Xóa khỏi máy" : "Lưu để xem offline"}
                >
                  {isSavedOffline ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" /> <span className="hidden sm:inline">Đã lưu</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> <span className="hidden sm:inline">Lưu Offline</span>
                    </>
                  )}
                </button>

                {/* Export PDF Button */}
                <button
                  onClick={() => setIsPdfOptionsOpen(true)}
                  disabled={isExportingPDF}
                  className="flex-1 sm:flex-none justify-center text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1.5 text-xs md:text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap"
                  title="Tải xuống tệp PDF"
                >
                  {isExportingPDF ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Xuất PDF</span>
                </button>

                {/* Print Button */}
                <button
                  onClick={handlePrint}
                  className="flex-1 sm:flex-none justify-center text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-1.5 text-xs md:text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap"
                  title="In phác đồ"
                >
                  <Printer className="w-4 h-4" /> <span className="hidden sm:inline">In</span>
                </button>

                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="flex-1 sm:flex-none justify-center text-gray-400 dark:text-gray-500 border border-transparent hover:border-gray-200 dark:hover:border-slate-700 hover:text-medical-600 dark:hover:text-medical-400 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs md:text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap"
                  title="Sao chép nội dung"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" /> <span className="hidden sm:inline">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> <span className="hidden sm:inline">Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="p-4 md:p-8 markdown-content min-h-[400px]">
               <ReactMarkdown 
                 remarkPlugins={[remarkGfm]}
                 components={{
                   img: ({node, ...props}) => {
                     const { children, ...rest } = props;
                     const [isError, setIsError] = useState(false);

                     if (isError) {
                        return (
                          <div className="my-4 p-3 border border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-800 flex items-center gap-3 text-sm">
                             <div className="bg-gray-200 dark:bg-slate-700 p-1.5 rounded-full flex-shrink-0">
                                <ImageOff className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                             </div>
                             <div className="flex-1 overflow-hidden">
                                <p className="text-gray-500 dark:text-slate-400 italic truncate">Hình ảnh không hiển thị được.</p>
                                {props.src && (
                                  <a 
                                    href={props.src} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-medical-600 hover:text-medical-700 underline text-xs flex items-center gap-1 mt-0.5 font-medium"
                                  >
                                    Thử mở liên kết gốc <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                             </div>
                          </div>
                        );
                     }

                     return (
                       <div className="my-6 group">
                          <div 
                            className="relative rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 cursor-zoom-in transition-all hover:shadow-md max-w-3xl mx-auto"
                            onClick={() => props.src && setSelectedImage(props.src)}
                          >
                              <img 
                                className="w-auto h-auto max-w-full max-h-[650px] mx-auto object-contain dark:brightness-90" 
                                loading="lazy"
                                referrerPolicy="no-referrer"
                                onError={() => setIsError(true)}
                                {...rest} 
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl">
                                  <Maximize2 className="w-8 h-8 text-white drop-shadow-md bg-black/20 rounded-full p-1.5 backdrop-blur-sm" />
                              </div>
                          </div>
                          {props.alt && (
                            <div className="flex items-center justify-center gap-1.5 mt-2 text-sm text-gray-500 dark:text-slate-400 italic">
                               <ImageIcon className="w-3.5 h-3.5" />
                               <span>{props.alt}</span>
                            </div>
                          )}
                       </div>
                     );
                   },
                 }}
               >
                 {data.content}
               </ReactMarkdown>
            </div>
          </div>
        </div>

        {/* Sidebar - Sources & Notes */}
        <div className={`lg:col-span-4 space-y-6 ${activeTab === 'protocol' ? 'hidden lg:block' : ''}`}>
          
          {/* Personal Note Section */}
          <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 ${activeTab !== 'notes' ? 'hidden lg:block' : ''}`}>
            <div className="border-b border-gray-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-900/20 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-500" />
                Ghi chú cá nhân
              </h3>
            </div>
            <div className="p-4">
              <textarea
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setIsSaved(false);
                }}
                className="w-full h-48 lg:h-32 p-3 text-base lg:text-sm text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 dark:focus:ring-amber-600 focus:border-amber-400 dark:focus:border-amber-500 resize-none"
                placeholder="Nhập ghi chú lâm sàng..."
              />
              <button
                onClick={handleSaveNoteClick}
                className={`mt-3 w-full flex items-center justify-center gap-2 py-3 lg:py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isSaved 
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700' 
                    : 'bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:border-gray-400'
                }`}
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" /> Đã lưu
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Lưu ghi chú
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Sources Section */}
          <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 sticky top-24 ${activeTab !== 'sources' ? 'hidden lg:block' : ''}`}>
            <div className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                <Link2 className="w-5 h-5 text-medical-600" />
                Nguồn tham khảo
              </h3>
            </div>
            <div className="p-4">
              {data.sources.length > 0 ? (
                <ul className="space-y-3">
                  {data.sources.map((source, idx) => (
                    <li key={idx}>
                      <a
                        href={source.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group block p-3 rounded-lg border border-gray-100 dark:border-slate-800 hover:border-medical-200 dark:hover:border-medical-700 hover:bg-medical-50 dark:hover:bg-slate-800 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-slate-300 group-hover:text-medical-700 dark:group-hover:text-medical-400 line-clamp-2">
                            {source.title}
                          </span>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-medical-500 flex-shrink-0 mt-0.5" />
                        </div>
                        <span className="text-xs text-gray-400 dark:text-slate-500 mt-1 block truncate group-hover:text-medical-400 dark:group-hover:text-medical-600">
                          {source.uri}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-slate-500 italic">
                  Không có nguồn tham khảo cụ thể được trích xuất.
                </div>
              )}
            </div>
            <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 text-center">
              Dữ liệu được tổng hợp tự động bởi Gemini AI
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print-only">
        <h1 className="text-3xl font-bold mb-2 uppercase">{title}</h1>
        <p className="text-sm text-gray-500 italic mb-6">Ngày xuất: {new Date().toLocaleString('vi-VN')}</p>
        
        {note && (
           <div className="mb-6 border border-gray-300 bg-gray-50 p-4 rounded">
              <h3 className="font-bold text-gray-800 mb-2">Ghi chú cá nhân:</h3>
              <p className="whitespace-pre-wrap">{note}</p>
           </div>
        )}

        <div className="markdown-content">
           <ReactMarkdown remarkPlugins={[remarkGfm]}>
             {data.content}
           </ReactMarkdown>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-300">
           <h3 className="font-bold mb-2">Nguồn tham khảo:</h3>
           <ul className="list-disc pl-5">
              {data.sources.map((s, i) => (
                 <li key={i} className="text-sm">
                    {s.title} <span className="text-gray-500">({s.uri})</span>
                 </li>
              ))}
           </ul>
        </div>
        
        <div className="mt-8 text-center text-xs text-gray-400">
           Tài liệu được trích xuất từ ứng dụng MediSearch VN. Thông tin chỉ mang tính chất tham khảo.
        </div>
      </div>

      {isPdfOptionsOpen && (
        <div 
            className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print"
            onClick={() => !isExportingPDF && setIsPdfOptionsOpen(false)}
        >
            <div 
                className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-md animate-scale-in border dark:border-slate-700"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-medical-600" />
                        Tùy chọn xuất PDF
                    </h3>
                    <button onClick={() => !isExportingPDF && setIsPdfOptionsOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full disabled:opacity-50" disabled={isExportingPDF}>
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">Khổ giấy</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setPdfOptions(prev => ({ ...prev, format: 'a4' }))}
                                disabled={isExportingPDF}
                                className={`flex items-center justify-center gap-2 p-3 border rounded-lg text-sm transition-colors disabled:opacity-60 ${pdfOptions.format === 'a4' ? 'bg-medical-50 dark:bg-medical-900/30 border-medical-400 dark:border-medical-600 text-medical-700 dark:text-medical-300 ring-2 ring-medical-200 dark:ring-medical-800' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                            >
                                <FileText className="w-4 h-4" /> A4 (210x297mm)
                            </button>
                            <button 
                                onClick={() => setPdfOptions(prev => ({ ...prev, format: 'a5' }))}
                                disabled={isExportingPDF}
                                className={`flex items-center justify-center gap-2 p-3 border rounded-lg text-sm transition-colors disabled:opacity-60 ${pdfOptions.format === 'a5' ? 'bg-medical-50 dark:bg-medical-900/30 border-medical-400 dark:border-medical-600 text-medical-700 dark:text-medical-300 ring-2 ring-medical-200 dark:ring-medical-800' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                            >
                                <FileText className="w-4 h-4" /> A5 (148x210mm)
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">Hướng giấy</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setPdfOptions(prev => ({ ...prev, orientation: 'portrait' }))}
                                disabled={isExportingPDF}
                                className={`flex items-center justify-center gap-2 p-3 border rounded-lg text-sm transition-colors disabled:opacity-60 ${pdfOptions.orientation === 'portrait' ? 'bg-medical-50 dark:bg-medical-900/30 border-medical-400 dark:border-medical-600 text-medical-700 dark:text-medical-300 ring-2 ring-medical-200 dark:ring-medical-800' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                            >
                                <Smartphone className="w-4 h-4" /> Dọc (Portrait)
                            </button>
                            <button 
                                onClick={() => setPdfOptions(prev => ({ ...prev, orientation: 'landscape' }))}
                                disabled={isExportingPDF}
                                className={`flex items-center justify-center gap-2 p-3 border rounded-lg text-sm transition-colors disabled:opacity-60 ${pdfOptions.orientation === 'landscape' ? 'bg-medical-50 dark:bg-medical-900/30 border-medical-400 dark:border-medical-600 text-medical-700 dark:text-medical-300 ring-2 ring-medical-200 dark:ring-medical-800' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                            >
                                <Monitor className="w-4 h-4" /> Ngang (Landscape)
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-slate-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                    <button 
                        onClick={() => setIsPdfOptionsOpen(false)}
                        disabled={isExportingPDF}
                        className="px-4 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleConfirmExportPDF}
                        disabled={isExportingPDF}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 w-32"
                    >
                        {isExportingPDF ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...
                            </>
                        ) : (
                            <>
                                <FileDown className="w-4 h-4" /> Xuất file
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {selectedImage && (
        <div 
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] flex items-center justify-center">
             <button 
                onClick={() => setSelectedImage(null)}
                className="absolute -top-12 right-0 md:top-[-1rem] md:right-[-1rem] z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
             >
                <X className="w-6 h-6" />
             </button>
             <img 
               src={selectedImage} 
               alt="Full view" 
               className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
               onClick={(e) => e.stopPropagation()} 
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResultDisplay;