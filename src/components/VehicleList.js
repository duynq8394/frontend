import React, { useState, useMemo } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import AddUser from './AddUser';

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

const VehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('cccd'); // Mặc định tìm kiếm theo CCCD
  const [statusFilter, setStatusFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearched, setIsSearched] = useState(false);

  const fetchVehicles = async (currentSearchTerm = '', currentSearchType = 'cccd') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = {};
      if (currentSearchTerm) {
        params[currentSearchType] = currentSearchTerm; // Sử dụng searchType (cccd hoặc licensePlate)
      }

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/vehicles`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setVehicles(response.data.vehicles);
      setIsSearched(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi khi lấy danh sách xe');
      setVehicles([]);
      setIsSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchTypeChange = (e) => {
    setSearchType(e.target.value);
    setSearchTerm(''); // Reset search term khi thay đổi loại tìm kiếm
    setVehicles([]);
    setIsSearched(false);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error('Vui lòng nhập thông tin để tìm kiếm.');
      setVehicles([]);
      setIsSearched(false);
      return;
    }
    fetchVehicles(searchTerm, searchType);
  };

  const handleShowAll = () => {
    fetchVehicles('', searchType);
  };

  // Lọc trạng thái trực tiếp trên client-side
  const filteredVehicles = useMemo(() => {
    if (!statusFilter) return vehicles;
    return vehicles.filter((vehicle) => vehicle.status === statusFilter);
  }, [vehicles, statusFilter]);

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // Hàm sắp xếp
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedVehicles = useMemo(() => {
    if (!sortConfig.key) return filteredVehicles;
    return [...filteredVehicles].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (sortConfig.key === 'timestamp') {
        const aTime = a.lastTransaction?.timestamp ? new Date(a.lastTransaction.timestamp) : new Date(0);
        const bTime = b.lastTransaction?.timestamp ? new Date(b.lastTransaction.timestamp) : new Date(0);
        return sortConfig.direction === 'asc' ? aTime - bTime : bTime - aTime;
      }
      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredVehicles, sortConfig]);

  const handleEdit = async (cccd) => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/search-by-cccd`, {
        params: { cccd },
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = {
        cccd: response.data.vehicles[0]?.cccd,
        fullName: response.data.vehicles[0]?.fullName,
        hometown: response.data.vehicles[0]?.hometown,
        dateOfBirth: response.data.vehicles[0]?.dateOfBirth,
        issueDate: response.data.vehicles[0]?.issueDate,
        gender: response.data.vehicles[0]?.gender || 'Nam',
        vehicles: response.data.vehicles.map((v) => ({
          licensePlate: v.licensePlate,
          vehicleType: v.vehicleType,
          color: v.color || '',
          brand: v.brand || '',
          status: v.status,
          lastTransaction: v.timestamp ? { action: v.status === 'Đang gửi' ? 'Gửi' : 'Lấy', timestamp: v.timestamp } : null,
        })),
      };
      setEditingUser(userData);
      setIsModalOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Không thể lấy thông tin người dùng để sửa.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    fetchVehicles(searchTerm, searchType);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const calculateDaysParked = (timestamp) => {
    if (!timestamp) return 'N/A';
    const parkedDate = new Date(timestamp);
    const currentDate = new Date();
    const diffTime = Math.abs(currentDate - parkedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-primary mb-4 text-center">Danh sách xe</h2>
      <div className="mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex space-x-2">
          <select
            value={searchType}
            onChange={handleSearchTypeChange}
            className="p-2 border rounded-lg focus:ring-primary focus:border-primary"
          >
            <option value="cccd">CCCD</option>
            <option value="licensePlate">Biển số xe</option>
          </select>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={`Tìm theo ${searchType === 'cccd' ? 'CCCD' : 'Biển số xe'}...`}
            className="w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
          >
            Tìm
          </button>
        </form>
        <select
          value={statusFilter}
          onChange={handleStatusFilterChange}
          className="p-2 border rounded-lg focus:ring-primary focus:border-primary"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Đang gửi">Đang gửi</option>
          <option value="Đã lấy">Đã lấy</option>
        </select>
        <button
          onClick={handleShowAll}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Hiển thị tất cả
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : !isSearched ? (
        <div className="text-center p-4 text-gray-500">
          Nhập {searchType === 'cccd' ? 'CCCD' : 'Biển số xe'} và nhấn Tìm hoặc nhấn Hiển thị tất cả để xem danh sách xe.
        </div>
      ) : sortedVehicles.length === 0 ? (
        <div className="text-center p-4 text-gray-500">
          Không tìm thấy xe phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('licensePlate')}>
                  Biển số {sortConfig.key === 'licensePlate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('cccd')}>
                  CCCD {sortConfig.key === 'cccd' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('fullName')}>
                  Họ tên {sortConfig.key === 'fullName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('vehicleType')}>
                  Loại xe {sortConfig.key === 'vehicleType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('color')}>
                  Màu xe {sortConfig.key === 'color' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('brand')}>
                  Nhãn hiệu {sortConfig.key === 'brand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('status')}>
                  Trạng thái {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('timestamp')}>
                  Số ngày gửi {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 text-left">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {sortedVehicles.map((vehicle) => (
                <tr key={`${vehicle.cccd}-${vehicle.licensePlate}`} className="border-b">
                  <td className="p-2 text-accent font-bold">{formatLicensePlate(vehicle.licensePlate)}</td>
                  <td className="p-2">{vehicle.cccd}</td>
                  <td className="p-2">{vehicle.fullName}</td>
                  <td className="p-2">{vehicle.vehicleType || 'Chưa xác định'}</td>
                  <td className="p-2">{vehicle.color || 'Chưa xác định'}</td>
                  <td className="p-2">{vehicle.brand || 'Chưa xác định'}</td>
                  <td className="p-2">{vehicle.status}</td>
                  <td className="p-2">{vehicle.status === 'Đang gửi' ? calculateDaysParked(vehicle.timestamp) : 'N/A'}</td>
                  <td className="p-2">
                    <button
                      onClick={() => handleEdit(vehicle.cccd)}
                      className="px-2 py-1 bg-accent text-white rounded hover:bg-yellow-600"
                    >
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-3xl relative max-h-full overflow-y-auto">
            <button
              onClick={handleCloseModal}
              className="absolute top-2 right-4 text-gray-500 hover:text-gray-800 text-3xl font-bold"
            >
              ×
            </button>
            <AddUser userToEdit={editingUser} onSave={handleSave} />
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default VehicleList;
