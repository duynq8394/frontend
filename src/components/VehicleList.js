import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import AddUser from './AddUser';
import 'react-toastify/dist/ReactToastify.css';

const formatLicensePlate = (plate) => {
  if (!plate) return '';
  const cleanPlate = plate.replace(/[-.]/g, '').toUpperCase();
  if (cleanPlate.includes('MĐ')) {
    const match = cleanPlate.match(/^(\d{2}MĐ\d)(\d{3})(\d{2})$/);
    if (match) return `${match[1]}-${match[2]}.${match[3]}`;
  }
  if (cleanPlate.length === 8) return `${cleanPlate.slice(0, 4)}-${cleanPlate.slice(4)}`;
  if (cleanPlate.length === 9) {
    const match = cleanPlate.match(/^(\d{2}[A-Z]\d?)(\d{3})(\d{2})$/);
    if (match) return `${match[1]}-${match[2]}.${match[3]}`;
  }
  return plate;
};

const VehicleList = () => {
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('licensePlate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(25);
  const [isSearched, setIsSearched] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let result = [...vehicles];
    
    // Lọc theo trạng thái
    if (statusFilter) {
      result = result.filter((v) => v.status === statusFilter);
    }

    // Tìm kiếm chính xác chuỗi chứa searchTerm
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter((v) =>
        (v.cccd && v.cccd.toLowerCase().includes(term)) ||
        (v.licensePlate && v.licensePlate.toLowerCase().includes(term)) ||
        (v.fullName && v.fullName.toLowerCase().includes(term))
      );
    }

    // Sắp xếp
    result.sort((a, b) => {
      let valueA = a[sortBy] || '';
      let valueB = b[sortBy] || '';
      if (sortBy === 'timestamp') {
        valueA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        valueB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      }
      if (typeof valueA === 'string') valueA = valueA.toLowerCase();
      if (typeof valueB === 'string') valueB = valueB.toLowerCase();
      if (sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    setFilteredVehicles(result);
  }, [vehicles, searchTerm, statusFilter, sortBy, sortOrder]);

  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVehicles(response.data.vehicles);
      setIsSearched(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi khi lấy danh sách xe');
      setVehicles([]);
      setFilteredVehicles([]);
      setIsSearched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm.trim() && !isSearched) {
      toast.error('Vui lòng nhập CCCD, biển số hoặc họ tên để tìm kiếm.');
      return;
    }
    setPage(1);
  };

  const handleShowAll = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPage(1);
    fetchVehicles();
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleSort = (column) => {
    const newSortOrder = sortBy === column && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortBy(column);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > Math.ceil(filteredVehicles.length / itemsPerPage)) return;
    setPage(newPage);
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
    fetchVehicles();
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

  const exportToExcel = () => {
    if (filteredVehicles.length === 0) {
      toast.warn('Không có dữ liệu để xuất ra Excel.');
      return;
    }

    const data = filteredVehicles.map((vehicle) => ({
      'Biển số': formatLicensePlate(vehicle.licensePlate),
      'CCCD': vehicle.cccd,
      'Họ tên': vehicle.fullName,
      'Loại xe': vehicle.vehicleType || 'Chưa xác định',
      'Màu xe': vehicle.color || 'Chưa xác định',
      'Nhãn hiệu': vehicle.brand || 'Chưa xác định',
      'Trạng thái': vehicle.status,
      'Số ngày gửi': vehicle.status === 'Đang gửi' ? calculateDaysParked(vehicle.timestamp) : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách xe');
    XLSX.writeFile(wb, 'vehicle_list.xlsx');
  };

  const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);
  const paginatedVehicles = filteredVehicles.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-primary mb-4 text-center">Danh sách xe</h2>
      <div className="mb-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm theo CCCD, biển số hoặc họ tên..."
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
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Xuất Excel
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
          Nhập CCCD, biển số hoặc họ tên và nhấn Tìm hoặc nhấn Hiển thị tất cả để xem danh sách xe.
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="text-center p-4 text-gray-500">
          Không tìm thấy xe phù hợp với bộ lọc.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('licensePlate')}>
                    Biển số {sortBy === 'licensePlate' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('cccd')}>
                    CCCD {sortBy === 'cccd' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('fullName')}>
                    Họ tên {sortBy === 'fullName' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2 text-left">Loại xe</th>
                  <th className="p-2 text-left">Màu xe</th>
                  <th className="p-2 text-left">Nhãn hiệu</th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('status')}>
                    Trạng thái {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2 text-left cursor-pointer" onClick={() => handleSort('timestamp')}>
                    Số ngày gửi {sortBy === 'timestamp' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="p-2 text-left">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVehicles.map((vehicle) => (
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
          <div className="flex justify-between mt-4">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
            >
              Trang trước
            </button>
            <span>Trang {page} / {totalPages}</span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg disabled:opacity-50"
            >
              Trang sau
            </button>
          </div>
        </>
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
