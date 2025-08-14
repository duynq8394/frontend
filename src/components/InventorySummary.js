import React, { useState, useEffect } from 'react';

const InventorySummary = () => {
  const [activeSessions, setActiveSessions] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInventoryStats();
  }, []);

  const fetchInventoryStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;

      const apiUrl = process.env.REACT_APP_API_URL || '';
      const fullUrl = `${apiUrl}/api/admin/inventory/sessions`;
      
      console.log('Fetching inventory stats with URL:', fullUrl);
      console.log('API URL from env:', process.env.REACT_APP_API_URL);

      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
      });

      console.log('Inventory stats response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Inventory stats response data:', data);
        const active = data.sessions.filter(s => s.status === 'active').length;
        setActiveSessions(active);
        setTotalSessions(data.sessions.length);
      }
    } catch (error) {
      console.error('Lỗi tải thống kê kiểm kê:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Thống Kê Kiểm Kê</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{activeSessions}</div>
          <div className="text-sm text-blue-700">Phiên đang hoạt động</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-gray-600">{totalSessions}</div>
          <div className="text-sm text-gray-700">Tổng số phiên</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <span className="text-lg mr-3">🔍</span>
            <div>
              <div className="font-medium text-gray-900">Tìm kiếm biển số</div>
              <div className="text-sm text-gray-600">Tất cả trạng thái xe</div>
            </div>
          </div>
          <div className="text-green-600 font-medium">✓</div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <span className="text-lg mr-3">📝</span>
            <div>
              <div className="font-medium text-gray-900">Ghi nhận kiểm kê</div>
              <div className="text-sm text-gray-600">Bộ đếm tự động</div>
            </div>
          </div>
          <div className="text-green-600 font-medium">✓</div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <span className="text-lg mr-3">📊</span>
            <div>
              <div className="font-medium text-gray-900">Báo cáo tổng hợp</div>
              <div className="text-sm text-gray-600">So sánh với xe đang gửi</div>
            </div>
          </div>
          <div className="text-green-600 font-medium">✓</div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">💡 Gợi ý sử dụng:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Tìm kiếm tất cả xe trong hệ thống (mọi trạng thái)</li>
          <li>• Báo cáo chỉ so sánh với xe đang gửi trong bãi</li>
          <li>• Mỗi phiên kiểm kê sẽ được lưu trữ riêng biệt</li>
          <li>• Có thể tạm dừng và tiếp tục phiên kiểm kê</li>
        </ul>
      </div>
    </div>
  );
};

export default InventorySummary; 