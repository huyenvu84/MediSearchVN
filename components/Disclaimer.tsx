import React from 'react';
import { AlertTriangle } from 'lucide-react';

const Disclaimer: React.FC = () => {
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500 p-4 mb-6 rounded-r-lg shadow-sm">
      <div className="flex">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-amber-400 dark:text-amber-500" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <span className="font-bold">Lưu ý quan trọng:</span> Thông tin chỉ mang tính chất tham khảo cho nhân viên y tế và sinh viên y khoa. 
            Luôn hội chẩn và tham khảo ý kiến chuyên gia đối với các ca bệnh phức tạp. Chúng tôi không chịu trách nhiệm cho các quyết định điều trị dựa trên thông tin này.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Disclaimer;