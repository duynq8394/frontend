import React from 'react';

// Hàm định dạng biển số xe
const formatLicensePlate = (plate) => {
  if (!plate) return '';
  const cleanPlate = plate.replace(/[-.]/g, '').toUpperCase();

  // Biển xe máy điện
  if (cleanPlate.includes('MĐ')) {
    const match = cleanPlate.match(/^(\d{2}MĐ\d)(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}-${match[2]}.${match[3]}`;
    }
  }

  // Biển xe máy
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

// Hàm xác định loại xe
const getVehicleType = (plate) => {
  if (!plate) return 'Chưa xác định';
  return plate.includes('MĐ') ? 'Xe máy điện' : 'Xe máy';
};

const UserInfo = ({ userInfo, onAction, isLoading }) => {
  const { user } = userInfo;

  return (
    <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-semibold text-primary mb-4 text-center">Thông tin</h2>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <p><span className="font-semibold">Họ tên:</span> {user.fullName}</p>
          <p><span className="font-medium">CCCD:</span> {user.cccd}</p>
          <p><span className="font-medium">Quê quán:</span> {user.hometown}</p>
          <p><span className="font-medium">Giới tính:</span> {user.gender}</p>
          <p><span className="font-medium">Ngày sinh:</span> {user.dateOfBirth}</p>
          <p><span className="font-medium">Ngày cấp:</span> {user.issueDate}</p>
        </div>
        <h3 className="text-2xl font-semibold text-primary mb-4 text-center">Danh sách xe</h3>
        {user.vehicles.map((vehicle, index) => (
          <div key={index} className="border-t pt-2">
            <p className="text-2xl font-bold text-accent text-center">
              {formatLicensePlate(vehicle.licensePlate)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <p><span className="font-medium">Loại xe:</span> {vehicle.vehicleType || getVehicleType(vehicle.licensePlate)}</p>
              <p><span className="font-medium">Trạng thái:</span> {vehicle.status}</p>
            </div>
            {vehicle.lastTransaction && (
              <p className="text-sm text-gray-600">
                <span className="font-medium">Lịch sử gần nhất:</span>{' '}
                {vehicle.lastTransaction.action} -{' '}
                {new Date(vehicle.lastTransaction.timestamp).toLocaleString('vi-VN')}
              </p>
            )}
            <div className="mt-4 flex justify-center space-x-4">
              {vehicle.status === 'Đã lấy' && (
                <button
                  onClick={() => onAction('Gửi', vehicle.licensePlate)}
                  disabled={isLoading}
                  className={`px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Gửi xe
                </button>
              )}
              {vehicle.status === 'Đang gửi' && (
                <button
                  onClick={() => onAction('Lấy', vehicle.licensePlate)}
                  disabled={isLoading}
                  className={`px-6 py-3 bg-secondary text-white rounded-lg font-medium hover:bg-green-700 transition-colors ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Lấy xe
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserInfo;