import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';

// --- Các hàm tiện ích ---
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
    return `${cleanPlate.slice(0, 4)}-${cleanPlate.slice(4, 7)}.${cleanPlate.slice(7)}`;
  }
  return plate;
};

const unformatLicensePlate = (plate) => {
  return plate.replace(/[-.]/g, '').toUpperCase();
};

const getVehicleType = (plate) => {
  if (!plate) return '';
  return plate.includes('MĐ') ? 'Xe máy điện' : 'Xe máy';
};

const AddUser = ({ userToEdit = null, onSave }) => {
  const [formData, setFormData] = useState({
    cccd: '',
    oldCmt: '',
    fullName: '',
    dateOfBirth: '',
    gender: '',
    hometown: '',
    issueDate: '',
    vehicles: [{ licensePlate: '', vehicleType: '', color: '', brand: '', status: 'Đã lấy' }],
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode('qr-reader-add');
  }, []);

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        ...userToEdit,
        dateOfBirth: userToEdit.dateOfBirth,
        issueDate: userToEdit.issueDate,
        vehicles: userToEdit.vehicles.map((v) => ({
          ...v,
          licensePlate: formatLicensePlate(v.licensePlate),
          vehicleType: v.vehicleType || getVehicleType(v.licensePlate),
          color: v.color || '', // Thêm trường color
          brand: v.brand || '', // Thêm trường brand
          status: v.status || 'Đã lấy',
        })) || [{ licensePlate: '', vehicleType: '', color: '', brand: '', status: 'Đã lấy' }],
      });
    }
  }, [userToEdit]);

  useEffect(() => {
    const qrCodeScanner = html5QrCodeRef.current;
    if (!qrCodeScanner) return;

    const startScanning = async () => {
      try {
        setIsLoading(true);
        await qrCodeScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 300, height: 300 } },
          async (decodedText) => {
            const [cccd, oldCmt, fullName, dob, gender, hometown, issueDate] = decodedText.split('|');
            setFormData((prevData) => ({
              ...prevData,
              cccd,
              oldCmt: oldCmt || '',
              fullName,
              dateOfBirth: dob,
              gender,
              hometown,
              issueDate,
            }));
            toast.success('Quét CCCD thành công!');
            setIsScanning(false);
          },
          (errorMessage) => {
            if (!errorMessage.includes('NotFoundException')) {
              console.error('Lỗi khi quét QR:', errorMessage);
            }
          }
        );
        setIsLoading(false);
      } catch (err) {
        toast.error('Không thể khởi động camera: ' + err.message);
        setIsScanning(false);
        setIsLoading(false);
      }
    };

    const stopScanning = async () => {
      if (qrCodeScanner && qrCodeScanner.getState() === 2) {
        try {
          await qrCodeScanner.stop();
          setIsLoading(false);
        } catch (err) {
          console.error('Lỗi khi dừng camera:', err);
          setIsLoading(false);
        }
      }
    };

    if (isScanning) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScanning]);

  const checkDuplicates = async () => {
    const token = localStorage.getItem('adminToken');
    try {
      if (!userToEdit && formData.cccd) {
        try {
          const cccdCheck = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/search-by-cccd?cccd=${formData.cccd}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cccdCheck.data && cccdCheck.data.vehicles.length > 0) {
            return `CCCD ${formData.cccd} đã được đăng ký trong hệ thống.`;
          }
        } catch (err) {
          if (err.response && err.response.status === 404) {
            // CCCD chưa tồn tại, tiếp tục kiểm tra biển số
          } else {
            throw err;
          }
        }
      }

      const validVehicles = formData.vehicles
        .filter((v) => v.licensePlate.trim() !== '')
        .map((v) => unformatLicensePlate(v.licensePlate));

      for (const licensePlate of validVehicles) {
        const vehicleCheck = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/vehicles`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const existingVehicle = vehicleCheck.data.vehicles.find(
          (v) => v.licensePlate === licensePlate && v.cccd !== formData.cccd
        );
        if (existingVehicle) {
          return `Biển số xe ${formatLicensePlate(licensePlate)} đã được đăng ký cho CCCD ${existingVehicle.cccd}.`;
        }
      }
      return null;
    } catch (err) {
      return err.response?.data?.error || 'Lỗi khi kiểm tra trùng lặp.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const duplicateError = await checkDuplicates();
      if (duplicateError) {
        toast.error(duplicateError);
        setIsLoading(false);
        return;
      }

      const validVehicles = formData.vehicles
        .filter((v) => v.licensePlate.trim() !== '')
        .map((v) => ({
          licensePlate: unformatLicensePlate(v.licensePlate),
          vehicleType: v.vehicleType || getVehicleType(v.licensePlate),
          color: v.color?.trim() || '', // Thêm trường color
          brand: v.brand?.trim() || '', // Thêm trường brand
          status: v.status || 'Đã lấy',
        }));

      if (validVehicles.length === 0) {
        toast.error('Vui lòng nhập ít nhất một biển số xe!');
        setIsLoading(false);
        return;
      }

      const token = localStorage.getItem('adminToken');
      const url = userToEdit
        ? `${process.env.REACT_APP_API_URL}/api/admin/update-user/${formData.cccd}`
        : `${process.env.REACT_APP_API_URL}/api/admin/add-user`;
      const method = userToEdit ? 'put' : 'post';

      const formattedData = {
        ...formData,
        vehicles: validVehicles,
      };

      await axios({
        method,
        url,
        data: formattedData,
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(userToEdit ? 'Cập nhật thành công!' : 'Thêm người dùng thành công!');
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi khi lưu thông tin');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e, index) => {
    const { name, value } = e.target;
    if (name.startsWith('vehicles')) {
      const newVehicles = [...formData.vehicles];
      const field = name.split('.')[2];
      if (field === 'licensePlate') {
        newVehicles[index].licensePlate = value;
        newVehicles[index].vehicleType = getVehicleType(value);
      } else if (field === 'status') {
        newVehicles[index].status = value;
      } else if (field === 'color') { // Thêm xử lý trường color
        newVehicles[index].color = value;
      } else if (field === 'brand') { // Thêm xử lý trường brand
        newVehicles[index].brand = value;
      }
      setFormData({ ...formData, vehicles: newVehicles });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addVehicle = () => {
    setFormData({
      ...formData,
      vehicles: [...formData.vehicles, { licensePlate: '', vehicleType: '', color: '', brand: '', status: 'Đã lấy' }],
    });
  };

  const removeVehicle = (index) => {
    if (formData.vehicles.length > 1) {
      setFormData({
        ...formData,
        vehicles: formData.vehicles.filter((_, i) => i !== index),
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg mx-auto">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
        {userToEdit ? 'Cập nhật người dùng' : 'Thêm người dùng'}
      </h2>

      <div className="mb-6">
        <div id="qr-reader-add" style={{ display: isScanning ? 'block' : 'none' }}></div>
        <button
          onClick={() => setIsScanning(!isScanning)}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg text-white font-medium transition-colors ${
            isScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-blue-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Đang tải Camera...' : (isScanning ? 'Dừng quét' : 'Quét CCCD')}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="cccd" className="block text-sm font-medium text-gray-700">CCCD</label>
            <input
              type="text"
              name="cccd"
              value={formData.cccd}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
              required
              disabled={userToEdit}
            />
          </div>
          <div>
            <label htmlFor="oldCmt" className="block text-sm font-medium text-gray-700">CMT cũ (Tùy chọn)</label>
            <input
              type="text"
              name="oldCmt"
              value={formData.oldCmt}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Họ tên</label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Ngày sinh</label>
            <input
              type="text"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div>
            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Giới tính</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
              required
            >
              <option value="">Chọn giới tính</option>
              <option value="Nam">Nam</option>
              <option value="Nữ">Nữ</option>
              <option value="Khác">Khác</option>
            </select>
          </div>
          <div>
            <label htmlFor="hometown" className="block text-sm font-medium text-gray-700">Quê quán</label>
            <input
              type="text"
              name="hometown"
              value={formData.hometown}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700">Ngày cấp</label>
            <input
              type="text"
              name="issueDate"
              value={formData.issueDate}
              onChange={handleChange}
              className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
              required
            />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {formData.vehicles.map((vehicle, index) => (
            <div key={index} className="flex flex-wrap items-end gap-2 p-3 border rounded-lg">
              <div className="flex-grow min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700">Biển số xe</label>
                <input
                  type="text"
                  name={`vehicles.${index}.licensePlate`}
                  value={vehicle.licensePlate}
                  onChange={(e) => handleChange(e, index)}
                  className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
                  required
                />
              </div>
              <div className="flex-grow min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700">Loại xe</label>
                <input
                  type="text"
                  value={vehicle.vehicleType}
                  className="mt-1 w-full p-2 border rounded-lg bg-gray-100"
                  readOnly
                />
              </div>
              <div className="flex-grow min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700">Màu xe</label>
                <input
                  type="text"
                  name={`vehicles.${index}.color`}
                  value={vehicle.color}
                  onChange={(e) => handleChange(e, index)}
                  className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex-grow min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700">Nhãn hiệu</label>
                <input
                  type="text"
                  name={`vehicles.${index}.brand`}
                  value={vehicle.brand}
                  onChange={(e) => handleChange(e, index)}
                  className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
                />
              </div>
              <div className="flex-grow min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700">Trạng thái</label>
                <select
                  name={`vehicles.${index}.status`}
                  value={vehicle.status || 'Đã lấy'}
                  onChange={(e) => handleChange(e, index)}
                  className="mt-1 w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
                >
                  <option value="Đã lấy">Đã lấy</option>
                  <option value="Đang gửi">Đang gửi</option>
                </select>
              </div>
              {formData.vehicles.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVehicle(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  Xóa
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addVehicle}
            className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Thêm xe
          </button>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Đang lưu...' : userToEdit ? 'Cập nhật' : 'Thêm người dùng'}
        </button>
      </form>
    </div>
  );
};

export default AddUser;
