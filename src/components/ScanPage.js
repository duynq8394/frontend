import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import UserInfo from './UserInfo';
import { useNavigate } from 'react-router-dom';

const ScanPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [parkedVehicleCount, setParkedVehicleCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const html5QrCodeRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode('qr-reader');
    fetchParkedVehicleCount();
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.getState() === 2) {
        html5QrCodeRef.current.stop().catch((err) => console.error('Lỗi khi dừng camera:', err));
      }
    };
  }, []);

  const fetchParkedVehicleCount = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/public/parked-vehicles`);
      setParkedVehicleCount(response.data.totalParked || 0);
    } catch (err) {
      console.error('Lỗi khi lấy số xe đang gửi:', err);
      setParkedVehicleCount(0);
    }
  };

  useEffect(() => {
    const qrCodeScanner = html5QrCodeRef.current;
    if (!qrCodeScanner) return;

    const startScanning = async () => {
      try {
        setIsLoading(true);
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          toast.error('Không tìm thấy camera trên thiết bị');
          setIsScanning(false);
          setIsLoading(false);
          return;
        }

        // Debug: In danh sách camera
        console.log('Danh sách camera:', cameras);

        // Tìm camera sau
        const rearCamera = cameras.find(
          (camera) =>
            camera.facingMode === 'environment' ||
            camera.label.toLowerCase().includes('back') ||
            camera.label.toLowerCase().includes('rear')
        );

        if (!rearCamera) {
          toast.warn('Không tìm thấy camera sau, vui lòng kiểm tra thiết bị');
          setIsScanning(false);
          setIsLoading(false);
          return;
        }

        console.log('Sử dụng camera:', rearCamera.label, rearCamera.id);

        await qrCodeScanner.start(
          { deviceId: { exact: rearCamera.id } },
          {
            fps: 15,
            qrbox: { width: 200, height: 200 },
            videoConstraints: {
              deviceId: { exact: rearCamera.id },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              focusMode: 'continuous',
            },
          },
          async (decodedText) => {
            setIsScanning(false);
            try {
              const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/scan`, {
                qrString: decodedText,
              });
              setUserInfo(response.data);
              toast.success('Quét mã QR thành công!');
            } catch (err) {
              toast.error(err.response?.data?.error || 'Lỗi khi quét mã QR');
            }
          },
          (errorMessage) => {
            if (!errorMessage.includes('NotFoundException')) {
              console.error('Lỗi khi quét QR:', errorMessage);
            }
          }
        );
        setIsLoading(false);
      } catch (err) {
        toast.error('Không thể khởi động camera sau: ' + err.message);
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

  const toggleFlash = async () => {
    try {
      if (html5QrCodeRef.current && isScanning) {
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: !flashOn }],
        });
        setFlashOn(!flashOn);
        toast.success(!flashOn ? 'Đã bật flash' : 'Đã tắt flash');
      }
    } catch (err) {
      toast.error('Không thể bật/tắt đèn flash: ' + err.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) {
      toast.error('Vui lòng nhập CCCD hoặc Họ tên để tìm kiếm');
      return;
    }
    setIsLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/search`, {
        params: { query: searchTerm },
      });
      setUserInfo(response.data);
      toast.success('Tìm kiếm thành công!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi khi tìm kiếm');
      setUserInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action, licensePlate) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/action`, {
        cccd: userInfo.user.cccd,
        licensePlate,
        action,
      });
      toast.success(`${action} xe thành công!`);
      setUserInfo((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          vehicles: prev.user.vehicles.map((v) =>
            v.licensePlate === licensePlate
              ? {
                  ...v,
                  status: response.data.status,
                  lastTransaction: { action, timestamp: response.data.timestamp },
                }
              : v
          ),
        },
      }));
      fetchParkedVehicleCount();
    } catch (err) {
      toast.error(err.response?.data?.error || `Lỗi khi ${action.toLowerCase()} xe`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      <h1 className="text-3xl font-bold text-center text-primary mb-6">Quét QR để gửi/lấy xe</h1>
      <div className="mb-6 bg-white p-6 rounded-lg shadow-lg">
        <p className="text-center font-semibold text-lg mb-4">
          Số xe đang trong bãi: <span className="text-accent">{parkedVehicleCount}</span>
        </p>
        <div className="flex justify-center mb-4">
          <button
            onClick={() => navigate('/admin/login')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
          >
            Đăng nhập Admin
          </button>
        </div>
        <div id="qr-reader" style={{ width: '100%', display: isScanning ? 'block' : 'none' }}></div>
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={() => setIsScanning(!isScanning)}
            disabled={isLoading}
            className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
              isScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-blue-700'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Đang tải Camera...' : isScanning ? 'Dừng quét' : 'Bắt đầu quét'}
          </button>
          <button
            onClick={toggleFlash}
            disabled={!isScanning || isLoading}
            className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
              flashOn ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-gray-500 hover:bg-gray-600'
            } ${!isScanning || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {flashOn ? 'Tắt Flash' : 'Bật Flash'}
          </button>
        </div>
        <form onSubmit={handleSearch} className="flex justify-center space-x-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nhập CCCD hoặc Họ tên..."
            className="p-2 border rounded-lg w-full max-w-md focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Tìm kiếm
          </button>
        </form>
      </div>
      {userInfo && <UserInfo userInfo={userInfo} onAction={handleAction} isLoading={isLoading} />}
    </div>
  );
};

export default ScanPage;
