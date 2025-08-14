import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const InventoryPage = () => {
  const navigate = useNavigate();
  const [searchDigits, setSearchDigits] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [checkedVehicles, setCheckedVehicles] = useState(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionDescription, setSessionDescription] = useState('');
  const [inventoryReport, setInventoryReport] = useState(null);

  // Lấy token từ localStorage
  const getAuthToken = () => {
    return localStorage.getItem('adminToken');
  };

  // Lấy API URL từ environment
  const getApiUrl = () => {
    return process.env.REACT_APP_API_URL || '';
  };

  // Kiểm tra xem có phiên kiểm kê đang hoạt động không
  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        navigate('/admin/login');
        return;
      }

      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}/api/admin/inventory/sessions`;
      
      console.log('Checking active session with URL:', fullUrl);
      console.log('API URL from env:', process.env.REACT_APP_API_URL);

      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Session check response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Session check response data:', data);
        const activeSession = data.sessions.find(s => s.status === 'active');
        if (activeSession) {
          setCurrentSession(activeSession);
          loadSessionRecords(activeSession._id);
        }
      }
    } catch (error) {
      console.error('Lỗi kiểm tra session:', error);
    }
  };

  const loadSessionRecords = async (sessionId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`${getApiUrl()}/api/admin/inventory/session/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const checkedMap = new Map();
        data.records.forEach(record => {
          checkedMap.set(record.licensePlate, record);
        });
        setCheckedVehicles(checkedMap);
      }
    } catch (error) {
      console.error('Lỗi tải bản ghi session:', error);
    }
  };

  const startNewSession = async () => {
    try {
      setIsLoading(true);
      setError('');

      const token = getAuthToken();
      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}/api/admin/inventory/start`;
      
      console.log('Starting new session with URL:', fullUrl);
      console.log('API URL from env:', process.env.REACT_APP_API_URL);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionName: sessionName || `Kiểm kê ${new Date().toLocaleDateString('vi-VN')}`,
          description: sessionDescription
        })
      });

      console.log('Start session response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Start session response data:', data);
        setCurrentSession({
          _id: data.sessionId,
          sessionName: sessionName || `Kiểm kê ${new Date().toLocaleDateString('vi-VN')}`,
          description: sessionDescription,
          startedAt: new Date(),
          status: 'active'
        });
        setCheckedVehicles(new Map());
        setShowStartModal(false);
        setSessionName('');
        setSessionDescription('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Lỗi khởi tạo phiên kiểm kê');
      }
    } catch (error) {
      console.error('Start session error:', error);
      setError('Lỗi kết nối server');
    } finally {
      setIsLoading(false);
    }
  };

  const searchLicensePlate = async () => {
    if (!searchDigits || searchDigits.length < 4 || searchDigits.length > 5) {
      setError('Vui lòng nhập 4-5 số cuối của biển số xe');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const token = getAuthToken();
      const apiUrl = getApiUrl();
      const fullUrl = `${apiUrl}/api/admin/inventory/search-license-plate/${searchDigits}`;
      
      console.log('Searching with URL:', fullUrl);
      console.log('API URL from env:', process.env.REACT_APP_API_URL);
      
      const response = await fetch(fullUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Search response status:', response.status);
      console.log('Search response headers:', response.headers);

      if (response.ok) {
        const data = await response.json();
        console.log('Search response data:', data);
        setSearchResults(data.results);
        if (data.results.length === 0) {
          setError('Không tìm thấy biển số xe nào có số cuối ' + searchDigits);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Lỗi tìm kiếm');
      }
    } catch (error) {
      console.error('Search error:', error);
      setError('Lỗi kết nối server');
    } finally {
      setIsLoading(false);
    }
  };

  const checkVehicle = async (vehicle) => {
    if (!currentSession) {
      setError('Vui lòng bắt đầu phiên kiểm kê trước');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const token = getAuthToken();
      const response = await fetch(`${getApiUrl()}/api/admin/inventory/check`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: currentSession._id,
          licensePlate: vehicle.licensePlate,
          status: 'checked'
        })
      });

      if (response.ok) {
        const data = await response.json();
        const updatedRecord = data.record;
        
        // Cập nhật danh sách đã kiểm kê
        const newCheckedVehicles = new Map(checkedVehicles);
        if (newCheckedVehicles.has(vehicle.licensePlate)) {
          // Tăng bộ đếm nếu đã kiểm kê trước đó
          const existing = newCheckedVehicles.get(vehicle.licensePlate);
          existing.count += 1;
          newCheckedVehicles.set(vehicle.licensePlate, existing);
        } else {
          newCheckedVehicles.set(vehicle.licensePlate, updatedRecord);
        }
        setCheckedVehicles(newCheckedVehicles);

        // Xóa khỏi kết quả tìm kiếm
        setSearchResults(prev => prev.filter(v => v.licensePlate !== vehicle.licensePlate));
        setSearchDigits('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Lỗi ghi nhận kiểm kê');
      }
    } catch (error) {
      setError('Lỗi kết nối server');
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    if (!currentSession) return;

    try {
      setIsLoading(true);
      setError('');

      const token = getAuthToken();
      const response = await fetch(`${getApiUrl()}/api/admin/inventory/end/${currentSession._id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setInventoryReport(data.report);
        setCurrentSession(null);
        setShowEndModal(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Lỗi kết thúc phiên kiểm kê');
      }
    } catch (error) {
      setError('Lỗi kết nối server');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Kiểm Kê Biển Số Xe</h1>
          <p className="text-gray-600">Quản lý và thực hiện kiểm kê biển số xe trong hệ thống</p>
        </div>

        {/* Session Control */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Phiên Kiểm Kê</h2>
            {!currentSession ? (
              <button
                onClick={() => setShowStartModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Bắt Đầu Phiên Mới
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Phiên: {currentSession.sessionName}
                </span>
                <button
                  onClick={() => setShowEndModal(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Kết Thúc Phiên
                </button>
              </div>
            )}
          </div>

          {currentSession && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Tên phiên:</span> {currentSession.sessionName}
              </div>
              <div>
                <span className="font-medium text-gray-700">Bắt đầu:</span> {formatDate(currentSession.startedAt)}
              </div>
              <div>
                <span className="font-medium text-gray-700">Đã kiểm kê:</span> {checkedVehicles.size} xe
              </div>
            </div>
          )}
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Tìm Kiếm Biển Số</h2>
          <div className="flex space-x-4 mb-4">
            <input
              type="text"
              value={searchDigits}
              onChange={(e) => setSearchDigits(e.target.value)}
              placeholder="Nhập 4-5 số cuối biển số xe"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={5}
            />
            <button
              onClick={searchLicensePlate}
              disabled={isLoading || !searchDigits}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {isLoading ? 'Đang tìm...' : 'Tìm Kiếm'}
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Kết quả tìm kiếm:</h3>
              {searchResults.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => checkVehicle(vehicle)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-blue-600">{vehicle.licensePlate}</div>
                      <div className="text-sm text-gray-600">
                        {vehicle.vehicleType} • {vehicle.color} • {vehicle.brand}
                      </div>
                      <div className="text-sm text-gray-500">
                        Chủ xe: {vehicle.ownerName} (CCCD: {vehicle.ownerCccd})
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Trạng thái</div>
                      <div className={`text-sm font-medium ${
                        vehicle.status === 'Đang gửi' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {vehicle.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checked Vehicles */}
        {checkedVehicles.size > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Danh Sách Đã Kiểm Kê</h2>
            <div className="space-y-3">
              {Array.from(checkedVehicles.values()).map((record) => (
                <div key={record.licensePlate} className="border border-gray-200 rounded-lg p-4 bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-green-700">{record.licensePlate}</div>
                      <div className="text-sm text-gray-600">
                        Kiểm kê lúc: {formatDate(record.checkedAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Số lần kiểm kê</div>
                      <div className="text-lg font-bold text-green-600">{record.count}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inventory Report */}
        {inventoryReport && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Báo Cáo Kiểm Kê</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{inventoryReport.totalVehicles}</div>
                <div className="text-sm text-blue-700">Tổng số xe</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">{inventoryReport.checkedVehicles}</div>
                <div className="text-sm text-green-700">Đã kiểm kê</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">{inventoryReport.uncheckedVehicles}</div>
                <div className="text-sm text-red-700">Chưa kiểm kê</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {inventoryReport.totalVehicles > 0 
                    ? Math.round((inventoryReport.checkedVehicles / inventoryReport.totalVehicles) * 100)
                    : 0
                  }%
                </div>
                <div className="text-sm text-gray-700">Tỷ lệ hoàn thành</div>
              </div>
            </div>

            {inventoryReport.uncheckedLicensePlates.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Biển Số Chưa Kiểm Kê:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {inventoryReport.uncheckedLicensePlates.map((plate, index) => (
                    <div key={index} className="bg-red-100 text-red-800 px-3 py-2 rounded text-center text-sm font-medium">
                      {plate}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p>Phiên kiểm kê: {inventoryReport.sessionName}</p>
              <p>Bắt đầu: {formatDate(inventoryReport.startedAt)}</p>
              <p>Kết thúc: {formatDate(inventoryReport.endedAt)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Start Session Modal */}
      {showStartModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Bắt Đầu Phiên Kiểm Kê Mới</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên phiên kiểm kê
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Nhập tên phiên kiểm kê"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (tùy chọn)
                </label>
                <textarea
                  value={sessionDescription}
                  onChange={(e) => setSessionDescription(e.target.value)}
                  placeholder="Nhập mô tả phiên kiểm kê"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowStartModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={startNewSession}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isLoading ? 'Đang tạo...' : 'Bắt Đầu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kết Thúc Phiên Kiểm Kê</h3>
            <p className="text-gray-600 mb-6">
              Bạn có chắc chắn muốn kết thúc phiên kiểm kê "{currentSession?.sessionName}"? 
              Hành động này sẽ tạo báo cáo tổng hợp và không thể hoàn tác.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={endSession}
                disabled={isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isLoading ? 'Đang xử lý...' : 'Kết Thúc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage; 