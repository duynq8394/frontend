import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

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

const VehicleListCompact = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchRecentVehicles();
  }, []);

  const fetchRecentVehicles = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/vehicles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Lấy 5 xe gần nhất
      setVehicles(response.data.vehicles.slice(0, 5));
    } catch (err) {
      console.error('Lỗi khi lấy danh sách xe:', err);
      setVehicles([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDaysParked = (timestamp) => {
    if (!timestamp) return 'N/A';
    const parkedDate = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - parkedDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} ngày`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500">
        Không có xe nào trong hệ thống.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vehicles.map((vehicle, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <span className="font-bold text-blue-600">
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
            <div className="text-sm text-gray-600 mt-1">
              {vehicle.fullName} • {vehicle.cccd}
            </div>
            {vehicle.status === 'Đang gửi' && vehicle.timestamp && (
              <div className="text-xs text-gray-500 mt-1">
                Đã gửi: {calculateDaysParked(vehicle.timestamp)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VehicleListCompact;
