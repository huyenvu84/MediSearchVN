import React, { useState, useMemo } from 'react';
import { HistoryItem } from '../types';
import { X, BookHeart, Search, Trash2, ArrowRight, StickyNote } from 'lucide-react';
import Highlight from './Highlight';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  onSelectItem: (query: string) => void;
  onDeleteItem: (query: string) => void;
}

const SavedItemsModal: React.FC<Props> = ({ isOpen, onClose, items, onSelectItem, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    return items.filter(item =>
      item.query.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] max-h-[700px] flex flex-col overflow-hidden animate-scale-in border dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
            <BookHeart className="w-6 h-6 text-medical-600" />
            Tủ thuốc cá nhân ({items.length})
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex-shrink-0">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm trong tủ thuốc..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-300 dark:focus:ring-medical-600"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredItems.length > 0 ? (
            <ul className="space-y-2">
              {filteredItems.map(item => (
                <li 
                  key={item.query} 
                  className="group flex items-center justify-between gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => onSelectItem(item.query)}
                  >
                    <p className="font-medium text-gray-800 dark:text-slate-200 group-hover:text-medical-600 dark:group-hover:text-medical-400">
                      <Highlight text={item.query} highlight={searchTerm} />
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {item.note && <StickyNote className="w-3.5 h-3.5 text-amber-500" />}
                      <span>Lưu ngày: {new Date(item.timestamp).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onDeleteItem(item.query)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      title={`Xóa "${item.query}"`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onSelectItem(item.query)}
                      className="p-2 text-gray-400 hover:text-medical-500 hover:bg-medical-50 dark:hover:bg-medical-900/30 rounded-full"
                      title={`Xem "${item.query}"`}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-slate-500">
              <p>{searchTerm ? 'Không tìm thấy kết quả phù hợp.' : 'Tủ thuốc của bạn chưa có gì.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedItemsModal;