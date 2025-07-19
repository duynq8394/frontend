import React, { useState } from 'react';
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
  const [statusFilter, setStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchVehicles = async (currentSearchTerm = '') => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const params = {};
      if (statusFilter) params.status = encodeURIComponent(statusFilter);
      if (currentSearchTerm) params.cccd = currentSearchTerm;

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/vehicles`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });

      setVehicles(response.data.vehicles);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi khi lấy danh sách xe');
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error('Vui lòng nhập CCCD để tìm kiếm.');
      setVehicles([]);
      return;
    }
    fetchVehicles(searchTerm);
  };

  const handleShowAll = () => {
    fetchVehicles(''); // Fetch all vehicles without a search term
  };

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
    fetchVehicles(searchTerm); // Re-fetch with current search term to update list
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
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm theo CCCD..."
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
          onChange={(e) => setStatusFilter(e.target.value)}
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
      ) : vehicles.length === 0 ? (
        <div className="text-center p-4 text-gray-500">
          Nhập CCCD và nhấn Tìm hoặc nhấn Hiển thị tất cả để xem danh sách xe.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left">Biển số</th>
                <th className="p-2 text-left">CCCD</th>
                <th className="p-2 text-left">Họ tên</th>
                <th className="p-2 text-left">Loại xe</th>
                <th className="p-2 text-left">Màu xe</th>
                <th className="p-2 text-left">Nhãn hiệu</th>
                <th className="p-2 text-left">Trạng thái</th>
                <th className="p-2 text-left">Số ngày gửi</th>
                <th className="p-2 text-left">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
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
