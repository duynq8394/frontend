import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const formatLicensePlate = (plate) => {
  if (!plate) return '';
  const cleanPlate = plate.replace(/[-.]/g, '').toUpperCase();
  if (cleanPlate.includes('MĐ')) {
    const match = cleanPlate.match(/^(\d{2}MĐ\d)(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}-${match[2]}.${match[3]}`;
    }
  }
  if (cleanPlate.length === 8) {
    return `${cleanPlate.slice(0, 4)}-${cleanPlate.slice(4)}`;
  }
  if (cleanPlate.length === 9) {
    const match = cleanPlate.match(/^(\d{2}[A-Z]\d?)(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}-${match[2]}.${match[3]}`;
    }
  }
  return plate;
};

const CombinedSearch = ({ onUserSelect, onVehicleSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      toast.error('Vui lòng nhập CCCD hoặc biển số xe để tìm kiếm');
      return;
    }

    setLoading(true);
    try {
      // Kiểm tra nếu là CCCD (12 số)
      if (/^\d{12}$/.test(searchTerm)) {
        // Tìm kiếm theo CCCD
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/search`, {
          params: { query: searchTerm }
        });
        onUserSelect(response.data);
        toast.success('Tìm kiếm thành công!');
        setShowResults(false);
      }
      // Kiểm tra nếu là số cuối biển số xe (3-5 số)
      else if (/^\d{3,5}$/.test(searchTerm)) {
        // Tìm kiếm theo số cuối biển số xe
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/search-by-plate-suffix`, {
          params: { suffix: searchTerm }
        });
        setVehicles(response.data.vehicles);
        setShowResults(true);
        if (response.data.vehicles.length === 0) {
          toast.info('Không tìm thấy xe nào có số cuối này');
        }
      }
      // Trường hợp còn lại: biển số xe đầy đủ hoặc các trường hợp khác
      else {
        // Tìm kiếm theo biển số xe đầy đủ hoặc các trường hợp khác
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/search`, {
          params: { query: searchTerm }
        });
        onUserSelect(response.data);
        toast.success('Tìm kiếm thành công!');
        setShowResults(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Lỗi khi tìm kiếm');
      setVehicles([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicle) => {
    onVehicleSelect(vehicle);
    setShowResults(false);
    setSearchTerm('');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-primary mb-4">Tìm kiếm</h3>
      
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nhập CCCD hoặc biển số xe..."
            className="flex-1 p-2 border rounded-lg focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            disabled={loading || !searchTerm.trim()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang tìm...' : 'Tìm kiếm'}
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          💡 Gợi ý: Nhập CCCD (12 số), biển số xe đầy đủ, hoặc 3-5 số cuối biển số xe để tìm kiếm
        </p>
      </form>

      {showResults && vehicles.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-700 mb-3">Kết quả tìm kiếm:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {vehicles.map((vehicle, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleVehicleSelect(vehicle)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-accent">
                        {formatLicensePlate(vehicle.licensePlate)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        vehicle.status === 'Đang gửi' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {vehicle.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Chủ xe: {vehicle.ownerName}
                    </p>
                    <p className="text-sm text-gray-500">
                      CCCD: {vehicle.ownerCccd}
                    </p>
                    <p className="text-sm text-gray-500">
                      Loại xe: {vehicle.vehicleType} | Màu: {vehicle.color || 'N/A'} | Nhãn hiệu: {vehicle.brand || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResults && vehicles.length === 0 && !loading && (
        <div className="text-center py-4">
          <p className="text-gray-500">Không tìm thấy xe nào có số cuối "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
};

export default CombinedSearch;
