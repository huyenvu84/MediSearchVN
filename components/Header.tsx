import React, { useState, useEffect } from 'react';
import { Activity, Stethoscope, Moon, Sun, BookHeart, NotebookText } from 'lucide-react';

interface Props {
  onResetSearch: () => void;
  onOpenSavedModal: () => void;
  onOpenNotesModal: () => void;
  savedProtocolsCount: number;
  notesCount: number;
}

const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      title={theme === 'light' ? 'Chuyển sang chế độ tối' : 'Chuyển sang chế độ sáng'}
    >
      {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
    </button>
  );
};


const Header: React.FC<Props> = ({ onResetSearch, onOpenSavedModal, onOpenNotesModal, savedProtocolsCount, notesCount }) => {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onResetSearch}>
          <div className="bg-medical-600 p-1.5 md:p-2 rounded-lg">
            <Stethoscope className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-slate-100 leading-none tracking-tight">
              MediSearch<span className="text-medical-600">VN</span>
            </h1>
            <span className="text-[10px] md:text-xs text-gray-500 dark:text-slate-400 font-medium tracking-wide hidden sm:block">TRA CỨU PHÁC ĐỒ CHUẨN</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
           <div className="hidden md:flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-gray-200 dark:border-slate-700">
             <Activity className="w-4 h-4 text-green-500" />
             <span>Dữ liệu từ Google Grounding</span>
           </div>
           
           <button 
             onClick={onOpenNotesModal}
             className="relative flex items-center gap-1.5 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
             title="Quản lý Ghi chú"
           >
              <NotebookText className="w-5 h-5" />
              {notesCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-white text-[10px] items-center justify-center">{notesCount}</span>
                </span>
              )}
           </button>
           
           <button 
             onClick={onOpenSavedModal}
             className="relative flex items-center gap-1.5 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" 
             title="Tủ thuốc cá nhân"
           >
              <BookHeart className="w-5 h-5" />
              {savedProtocolsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-medical-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-medical-500 text-white text-[10px] items-center justify-center">{savedProtocolsCount}</span>
                </span>
              )}
           </button>

           <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export default Header;