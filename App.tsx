import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Loader2, Sparkles, Clock, History, Trash2, StickyNote, WifiOff, Bookmark, ArrowRight, Book, RefreshCw, Bell, AlertCircle, Archive, Wifi, X, ArrowUp, PlusCircle } from 'lucide-react';
import Header from './components/Header';
import Disclaimer from './components/Disclaimer';
import SearchResultDisplay from './components/SearchResultDisplay';
import { searchProtocol } from './services/geminiService';
import { SearchState, HistoryItem, SearchResult } from './types';
import DrugInteractionChecker from './components/DrugInteractionChecker';
import SavedItemsModal from './components/SavedItemsModal';
import NotesManagerModal from './components/NotesManagerModal';

const HISTORY_KEY = 'medisearch_history_v1';
const SAVED_PROTOCOLS_KEY = 'medisearch_saved_protocols_v1';
const MAX_HISTORY_ITEMS = 10;
const STALE_THRESHOLD = 7 * 24 * 60 * 60 * 1000; 

interface Notification {
  message: string;
  type: 'warning' | 'error' | 'success';
}

const initialState: SearchState = {
  isLoading: false,
  data: null,
  error: null,
  query: '',
  isOffline: false,
};

const App: React.FC = () => {
  const [state, setState] = useState<SearchState>(initialState);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [savedProtocols, setSavedProtocols] = useState<HistoryItem[]>([]);
  const [updatingProtocolQuery, setUpdatingProtocolQuery] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isInteractionCheckerOpen, setIsInteractionCheckerOpen] = useState(false);
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [isScrollButtonVisible, setIsScrollButtonVisible] = useState(false);
  
  const savedSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      
      const savedProtos = localStorage.getItem(SAVED_PROTOCOLS_KEY);
      if (savedProtos) {
         const migrated = JSON.parse(savedProtos).map((p: any) => ({ ...p, lastUpdated: p.lastUpdated || p.timestamp }));
         setSavedProtocols(migrated);
      }
    } catch (error) {
      console.error("Failed to load local storage", error);
    }

    const toggleVisibility = () => setIsScrollButtonVisible(window.scrollY > 300);
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const updateHistoryState = (query: string, options: { result?: SearchResult, note?: string } = {}) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    setHistory(prev => {
      const now = Date.now();
      const existingItem = prev.find(item => item.query.toLowerCase() === trimmedQuery.toLowerCase());
      const newItem: HistoryItem = {
        query: trimmedQuery,
        timestamp: now,
        lastUpdated: options.result ? now : (existingItem?.lastUpdated || now),
        note: options.note !== undefined ? options.note : (existingItem?.note || ''),
        cachedResult: options.result !== undefined ? options.result : existingItem?.cachedResult
      };
      const updated = [newItem, ...prev.filter(item => item.query.toLowerCase() !== trimmedQuery.toLowerCase())].slice(0, MAX_HISTORY_ITEMS);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });

    setSavedProtocols(prev => {
        const idx = prev.findIndex(item => item.query.toLowerCase() === trimmedQuery.toLowerCase());
        if (idx !== -1) {
             const updated = [...prev];
             if (options.note !== undefined) updated[idx].note = options.note;
             if (options.result !== undefined) {
                 updated[idx].cachedResult = options.result;
                 updated[idx].lastUpdated = Date.now();
             }
             localStorage.setItem(SAVED_PROTOCOLS_KEY, JSON.stringify(updated));
             return updated;
        }
        return prev;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const toggleSaveOffline = () => {
      if (!state.data || !state.query) return;
      const currentQuery = state.query.trim();
      
      setSavedProtocols(prev => {
          const exists = prev.some(item => item.query.toLowerCase() === currentQuery.toLowerCase());
          let updated;
          if (exists) {
              updated = prev.filter(item => item.query.toLowerCase() !== currentQuery.toLowerCase());
              setNotification({ message: "Đã xóa khỏi tủ thuốc cá nhân.", type: 'success' });
          } else {
              const now = Date.now();
              const newItem: HistoryItem = {
                  query: currentQuery, timestamp: now, lastUpdated: now,
                  note: currentNote, cachedResult: state.data!
              };
              updated = [newItem, ...prev];
              setNotification({ message: "Đã lưu vào tủ thuốc (có thể xem offline).", type: 'success' });
          }
          try {
              localStorage.setItem(SAVED_PROTOCOLS_KEY, JSON.stringify(updated));
          } catch (e) {
              console.error("Failed to save protocols", e);
              alert("Không gian lưu trữ đã đầy.");
          }
          return updated;
      });
  };
  
  const deleteSavedProtocol = (queryToDelete: string) => {
    setSavedProtocols(prev => {
      const updated = prev.filter(p => p.query.toLowerCase() !== queryToDelete.toLowerCase());
      localStorage.setItem(SAVED_PROTOCOLS_KEY, JSON.stringify(updated));
      return updated;
    });
    setNotification({ message: `Đã xóa "${queryToDelete}" khỏi tủ thuốc.`, type: 'success' });
  };


  const refreshProtocol = async (e: React.MouseEvent, item: HistoryItem) => {
    e.stopPropagation();
    if (!navigator.onLine) {
        setNotification({ message: "Bạn đang Offline. Vui lòng kết nối mạng để làm mới phác đồ.", type: 'warning' });
        return;
    }
    const query = item.query;
    setUpdatingProtocolQuery(query);
    try {
        let finalContent = "";
        const sources = await searchProtocol(query, (text) => {
             finalContent = text;
             if (state.query.toLowerCase() === query.toLowerCase()) {
                setState(prev => ({ ...prev, data: { content: text, sources: prev.data?.sources || [] } }));
             }
        });
        const result: SearchResult = { content: finalContent, sources };
        updateHistoryState(query, { result });
        if (state.query.toLowerCase() === query.toLowerCase()) {
            setState(prev => ({ ...prev, data: result, isOffline: false }));
        }
        setNotification({ message: `Đã cập nhật: ${query}`, type: 'success' });
    } catch (error) {
        console.error("Failed to update protocol", error);
        setNotification({ message: "Không thể cập nhật. Vui lòng thử lại sau.", type: 'error' });
    } finally {
        setUpdatingProtocolQuery(null);
    }
  };

  const performSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSavedModalOpen(false);
    setIsNotesModalOpen(false);

    if (!navigator.onLine) {
       const cachedItem = savedProtocols.find(h => h.query.toLowerCase() === queryText.toLowerCase()) || history.find(h => h.query.toLowerCase() === queryText.toLowerCase());
       if (cachedItem?.cachedResult) {
          setState({ query: queryText, isLoading: false, data: cachedItem.cachedResult, isOffline: true, error: null });
          updateHistoryState(queryText);
          setNotification({ message: "Đang xem dữ liệu Offline.", type: 'warning' });
       } else {
          setState({ ...initialState, query: queryText, error: "OFFLINE_NO_DATA" });
       }
       return;
    }

    setState({ ...initialState, query: queryText, isLoading: true });
    
    try {
      let finalContent = "";
      const sources = await searchProtocol(queryText, (streamedText) => {
          if (!finalContent) { // First chunk
            setState(prev => ({ ...prev, isLoading: false, data: { content: streamedText, sources: [] } }));
          } else { // Subsequent chunks
            setState(prev => ({ ...prev, data: { ...prev.data!, content: streamedText } }));
          }
          finalContent = streamedText;
      });
      const finalResult: SearchResult = { content: finalContent, sources };
      setState(prev => ({ ...prev, isLoading: false, data: finalResult }));
      updateHistoryState(queryText, { result: finalResult });
    } catch (error: any) {
      console.error("Search failed:", error);
      const cachedItem = savedProtocols.find(h => h.query.toLowerCase() === queryText.toLowerCase()) || history.find(h => h.query.toLowerCase() === queryText.toLowerCase());
      if (cachedItem?.cachedResult) {
        setState({ isLoading: false, data: cachedItem.cachedResult, isOffline: true, error: null, query: queryText });
        updateHistoryState(queryText); 
        setNotification({ message: "Mất kết nối. Đang hiển thị bản lưu cũ.", type: 'warning' });
      } else {
        const friendlyMessage = "Yêu cầu tra cứu thất bại. Vui lòng kiểm tra kết nối mạng và thử lại sau.";
        setState(prev => ({ ...prev, isLoading: false, error: friendlyMessage }));
      }
    }
  };

  const itemsWithNotes = useMemo(() => {
    const notesMap = new Map<string, HistoryItem>();
    
    // Prioritize saved protocols to get the latest note/data
    savedProtocols.forEach(item => {
        if (item.note && item.note.trim()) {
            notesMap.set(item.query.toLowerCase(), item);
        }
    });
    
    // Add from history if not already in the map from saved protocols
    history.forEach(item => {
        if (item.note && item.note.trim() && !notesMap.has(item.query.toLowerCase())) {
            notesMap.set(item.query.toLowerCase(), item);
        }
    });

    // Return as an array, sorted by the most recent timestamp
    return Array.from(notesMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [savedProtocols, history]);

  const handleResetSearch = () => setState(prev => ({ ...initialState, query: '' }));
  const handleFormSubmit = (e: React.FormEvent) => { e.preventDefault(); performSearch(state.query); };
  const updateNoteForQuery = (note: string) => { if (state.query) updateHistoryState(state.query, { note }); };
  const scrollToSaved = () => {
    if (savedSectionRef.current) savedSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    handleResetSearch();
  };
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const currentItem = savedProtocols.find(h => h.query.toLowerCase() === state.query.toLowerCase()) || history.find(h => h.query.toLowerCase() === state.query.toLowerCase());
  const currentNote = currentItem?.note || '';
  const isSavedOffline = savedProtocols.some(h => h.query.toLowerCase() === state.query.toLowerCase());
  const staleProtocolsCount = savedProtocols.filter(p => (Date.now() - (p.lastUpdated || p.timestamp)) > STALE_THRESHOLD).length;

  const suggestions = ["Sốt xuất huyết Dengue", "Tăng huyết áp vô căn", "Đái tháo đường type 2", "Viêm phổi cộng đồng", "Nhồi máu cơ tim cấp"];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-200 font-sans relative">
      <Header 
        onResetSearch={handleResetSearch} 
        onOpenSavedModal={() => setIsSavedModalOpen(true)} 
        onOpenNotesModal={() => setIsNotesModalOpen(true)}
        savedProtocolsCount={savedProtocols.length}
        notesCount={itemsWithNotes.length}
      />
      
      {notification && (
        <div className="fixed top-20 right-4 z-[100] animate-fade-in-right no-print">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border border-opacity-20 backdrop-blur-sm max-w-sm ${
            notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700' :
            notification.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700' :
            'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700'
          }`}>
             {notification.type === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : notification.type === 'warning' ? <WifiOff className="w-5 h-5 flex-shrink-0" /> : <Bookmark className="w-5 h-5 flex-shrink-0" />}
             <p className="text-sm font-medium">{notification.message}</p>
             <button onClick={() => setNotification(null)} className="ml-2 text-current opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        
        {!state.data && !state.isLoading && state.error !== "OFFLINE_NO_DATA" && staleProtocolsCount > 0 && (
            <div className="max-w-4xl mx-auto mb-6 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 rounded-lg p-3 flex items-start sm:items-center gap-3 animate-fade-in-up no-print">
                <Bell className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="flex-1">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                        <span className="font-semibold">Thông báo cập nhật:</span> Có {staleProtocolsCount} phác đồ trong tủ thuốc của bạn đã cũ. Hãy làm mới để lấy thông tin mới nhất.
                    </p>
                </div>
            </div>
        )}

        <div className={`transition-all duration-500 ease-in-out ${state.data ? 'mb-4 md:mb-8' : 'min-h-[50vh] md:min-h-[60vh] flex flex-col justify-center items-center'}`}>
          <div className={`w-full ${state.data ? '' : 'max-w-4xl text-center space-y-6 md:space-y-8'}`}>
            
            {!state.data && state.error !== "OFFLINE_NO_DATA" && (
              <>
                <h2 className="text-3xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 tracking-tight no-print">
                  Tra cứu <span className="text-medical-600 block sm:inline">Phác đồ Y khoa</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-base md:text-xl max-w-2xl mx-auto leading-relaxed px-2 no-print">
                  Công cụ hỗ trợ tra cứu nhanh phác đồ điều trị, liều lượng thuốc và hướng dẫn chẩn đoán.
                </p>
              </>
            )}

            {state.error !== "OFFLINE_NO_DATA" && (
                <div className={`no-print ${state.data ? 'max-w-3xl' : 'max-w-2xl mx-auto'}`}>
                    <form onSubmit={handleFormSubmit} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
                            <Search className={`h-5 w-5 md:h-6 md:w-6 ${state.isLoading ? 'text-medical-400' : 'text-gray-400 dark:text-gray-500'}`} />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-12 py-3.5 md:pl-12 md:py-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl md:rounded-2xl text-base md:text-lg placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-medical-200 dark:focus:ring-medical-800/50 focus:border-medical-500 dark:focus:border-medical-500 transition-all shadow-sm hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-slate-900"
                            placeholder="Nhập tên bệnh lý..."
                            value={state.query}
                            onChange={(e) => setState(prev => ({ ...prev, query: e.target.value }))}
                            disabled={state.isLoading}
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center">
                            {state.isLoading ? ( <Loader2 className="h-5 w-5 md:h-6 md:w-6 text-medical-600 animate-spin mr-2" /> ) : (
                            <button type="submit" className="p-1.5 md:p-2 bg-medical-600 text-white rounded-lg md:rounded-xl hover:bg-medical-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation" disabled={!state.query.trim()}>
                                <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                            </button>
                            )}
                        </div>
                    </form>
                </div>
            )}
            
            {state.data && (
              <div className="max-w-3xl mx-auto no-print">
                <button onClick={handleResetSearch} className="flex items-center gap-2 text-sm font-medium text-medical-600 dark:text-medical-400 hover:text-medical-700 dark:hover:text-medical-300 bg-medical-50 dark:bg-medical-900/20 hover:bg-medical-100 dark:hover:bg-medical-900/40 px-4 py-2 rounded-lg transition-colors">
                  <PlusCircle className="w-4 h-4" />
                  Tạo tìm kiếm mới
                </button>
              </div>
            )}

            {!state.data && !state.isLoading && !state.error && (
              <div className="space-y-10 no-print">
                <div className="max-w-2xl mx-auto">
                   <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                     <Sparkles className="w-3.5 h-3.5" /> Gợi ý phổ biến
                   </div>
                  <div className="flex overflow-x-auto pb-2 md:pb-0 md:flex-wrap md:justify-center gap-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => performSearch(s)} className="flex-shrink-0 px-3 py-2 md:py-1.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full text-sm text-gray-600 dark:text-slate-300 hover:border-medical-400 dark:hover:border-medical-600 hover:text-medical-700 dark:hover:text-medical-400 transition-colors shadow-sm whitespace-nowrap">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="about-author-section max-w-4xl mx-auto text-left bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-sm p-6 flex flex-col sm:flex-row items-center gap-6 animate-fade-in-up">
                  <img src="https://images.unsplash.com/photo-1580894908361-967195033215?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=128&h=128&q=80" alt="BS Huyền Vũ" className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-medical-100 dark:border-medical-800 shadow-md flex-shrink-0" />
                  <div className="text-center sm:text-left">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">Về tác giả & Ứng dụng</h3>
                    <p className="text-gray-600 dark:text-slate-400 mt-2 leading-relaxed text-sm md:text-base">
                      Chào mừng đến với MediSearch VN! Tôi là <span className="font-semibold text-medical-700 dark:text-medical-400">BS Huyền Vũ</span>, người phát triển ứng dụng này với mong muốn cung cấp một công cụ tra cứu phác đồ điều trị nhanh chóng, chính xác và luôn được cập nhật cho đồng nghiệp.
                    </p>
                  </div>
                </div>

                {savedProtocols.length > 0 && (
                   <div ref={savedSectionRef} className="max-w-4xl mx-auto text-left">
                     <div className="flex items-center gap-2 mb-4 px-1">
                        <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-md"><Book className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
                        <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-slate-200">Tủ thuốc cá nhân <span className="text-sm font-normal text-gray-500 dark:text-slate-400 ml-1">(Offline)</span></h3>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {savedProtocols.slice(0,3).map((p, idx) => {
                            const isUpdating = updatingProtocolQuery === p.query;
                            const isStale = (Date.now() - (p.lastUpdated || p.timestamp)) > STALE_THRESHOLD;
                            return (
                                <div key={idx} onClick={() => !isUpdating && performSearch(p.query)} className={`group bg-white dark:bg-slate-800/80 border rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between h-32 relative ${isUpdating ? 'border-indigo-200 dark:border-indigo-700 opacity-70' : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-md'}`}>
                                    {isStale && (<div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" title="Cần cập nhật"></div>)}
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-gray-800 dark:text-slate-200 line-clamp-2 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 pr-6">{p.query}</h4>
                                        {!isUpdating && <Bookmark className="w-4 h-4 text-indigo-400 fill-current flex-shrink-0 absolute top-4 right-4" />}
                                    </div>
                                    <div className="flex items-end justify-between mt-2">
                                        <div className="flex flex-col gap-0.5">
                                             <span className="text-xs text-gray-400 dark:text-slate-500">{p.note ? 'Có ghi chú' : 'Đã lưu'}</span>
                                            {isStale && <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5"><AlertCircle className="w-3 h-3"/> Cần cập nhật</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={(e) => refreshProtocol(e, p)} className={`p-1.5 rounded-full transition-colors ${isUpdating ? 'bg-indigo-50 dark:bg-indigo-900' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/50 text-gray-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`} title="Cập nhật nội dung mới nhất" disabled={isUpdating}>
                                                <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
                                            </button>
                                            <div className={`p-1.5 rounded-full bg-gray-50 dark:bg-slate-700 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/50 text-gray-300 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors ${isUpdating ? 'invisible' : ''}`}>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                     {savedProtocols.length > 3 && (
                        <button onClick={() => setIsSavedModalOpen(true)} className="text-sm font-medium text-medical-600 dark:text-medical-400 hover:underline mt-4">Xem tất cả {savedProtocols.length} mục...</button>
                     )}
                   </div>
                )}

                {history.length > 0 && (
                  <div className="max-w-2xl mx-auto text-left md:text-center border-t border-gray-100 dark:border-slate-800 pt-8">
                    <div className="flex items-center justify-between md:justify-center mb-4 px-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider"><History className="w-3.5 h-3.5" />Tìm kiếm gần đây</div>
                      <button onClick={clearHistory} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors md:ml-4"><Trash2 className="w-3 h-3" /> Xóa</button>
                    </div>
                    <div className="flex overflow-x-auto pb-2 md:pb-0 md:flex-wrap md:justify-center gap-2 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
                      {history.map((h, idx) => (
                        <button key={idx} onClick={() => performSearch(h.query)} className="flex-shrink-0 group flex items-center gap-2 px-3 py-2 md:py-1.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:border-medical-300 dark:hover:border-medical-600 hover:text-medical-700 dark:hover:text-medical-400 transition-all shadow-sm whitespace-nowrap">
                          {h.cachedResult && !navigator.onLine ? (<WifiOff className="w-3.5 h-3.5 text-gray-400" />) : h.note ? (<StickyNote className="w-3.5 h-3.5 text-amber-500" />) : (<Clock className="w-3.5 h-3.5 text-gray-400 group-hover:text-medical-500" />)}
                          {h.query}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {state.isLoading && !state.data && (
           <div className="max-w-5xl mx-auto mt-12 space-y-8 animate-pulse no-print">
             <div className="h-8 bg-gray-200 dark:bg-slate-800 rounded w-1/3 mb-4"></div>
             <div className="space-y-3">
               <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-full"></div>
               <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-full"></div>
               <div className="h-4 bg-gray-200 dark:bg-slate-800 rounded w-5/6"></div>
             </div>
           </div>
        )}

        {state.error === "OFFLINE_NO_DATA" && (
            <div className="max-w-xl mx-auto mt-8 text-center bg-white dark:bg-slate-900 p-8 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm animate-fade-in-up no-print">
                <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4"><WifiOff className="w-8 h-8 text-gray-500" /></div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100 mb-2">Không có kết nối mạng</h3>
                <p className="text-gray-500 dark:text-slate-400 mb-6">Bạn đang offline và không có bản lưu trữ cho <strong>"{state.query}"</strong>. Vui lòng kết nối mạng hoặc xem tủ thuốc cá nhân.</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button onClick={handleResetSearch} className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors">Quay lại trang chủ</button>
                    {savedProtocols.length > 0 && (<button onClick={() => setIsSavedModalOpen(true)} className="px-5 py-2.5 bg-medical-600 text-white rounded-xl hover:bg-medical-700 font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"><Archive className="w-4 h-4" />Xem tủ thuốc</button>)}
                </div>
            </div>
        )}

        {state.error && state.error !== "OFFLINE_NO_DATA" && (
          <div className="max-w-3xl mx-auto mt-8 text-center bg-red-50 dark:bg-red-900/30 p-6 rounded-xl border border-red-100 dark:border-red-800/50 no-print">
            <p className="text-red-600 dark:text-red-300 font-medium">{state.error}</p>
            <button onClick={() => performSearch(state.query)} className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors text-sm font-medium">Thử lại</button>
          </div>
        )}

        {state.data && (
          <div className="animate-fade-in-up">
            <div className="no-print"><Disclaimer /></div>
            <SearchResultDisplay title={state.query} data={state.data} initialNote={currentNote} onSaveNote={updateNoteForQuery} isOffline={state.isOffline} isSavedOffline={isSavedOffline} onToggleOfflineSave={toggleSaveOffline} />
          </div>
        )}
      </main>

      <DrugInteractionChecker isOpen={isInteractionCheckerOpen} onClose={() => setIsInteractionCheckerOpen(false)} />
      <SavedItemsModal isOpen={isSavedModalOpen} onClose={() => setIsSavedModalOpen(false)} items={savedProtocols} onSelectItem={performSearch} onDeleteItem={deleteSavedProtocol} />
      <NotesManagerModal isOpen={isNotesModalOpen} onClose={() => setIsNotesModalOpen(false)} items={itemsWithNotes} onSelectItem={performSearch} />

      <footer className="bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 py-6 md:py-8 mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 dark:text-slate-500 text-xs md:text-sm">© {new Date().getFullYear()} MediSearch VN - Phát triển bởi BS Huyền Vũ.</p>
        </div>
      </footer>

       <button onClick={scrollToTop} className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-medical-600 text-white shadow-lg hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 transition-all duration-300 ${isScrollButtonVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'}`} aria-label="Cuộn lên đầu trang" title="Cuộn lên đầu trang">
        <ArrowUp className="h-6 w-6" />
      </button>
    </div>
  );
};

export default App;