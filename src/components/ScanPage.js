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
  const videoRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode('qr-reader');
    fetchParkedVehicleCount();

    return () => stopScanner();
  }, []);

  const fetchParkedVehicleCount = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/public/parked-vehicles`);
      setParkedVehicleCount(res.data.totalParked || 0);
    } catch {
      setParkedVehicleCount(0);
    }
  };

  const startScanner = async () => {
    try {
      setIsLoading(true);
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        toast.error('Không tìm thấy camera');
        return;
      }

      await html5QrCodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 30,
          qrbox: { width: 280, height: 280 },
          aspectRatio: 1.0,
          videoConstraints: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        async (decodedText) => {
          if (!decodedText) return;
          await html5QrCodeRef.current.pause();
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
        (errMsg) => {
          if (!errMsg.includes('NotFoundException')) console.error(errMsg);
        }
      );
    } catch (err) {
      toast.error('Không thể mở camera: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current?.getState() === 2) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error('Lỗi khi dừng camera:', err);
      }
    }
  };

  useEffect(() => {
    if (isScanning) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => stopScanner();
  }, [isScanning]);

  const toggleFlash = async () => {
    try {
      if (html5QrCodeRef.current && isScanning) {
        const newFlash = !flashOn;
        await html5QrCodeRef.current.applyVideoConstraints({
          advanced: [{ torch: newFlash }],
        });
        setFlashOn(newFlash);
      }
    } catch (err) {
      toast.error('Không thể bật/tắt flash: ' + err.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) {
      toast.error('Vui lòng nhập CCCD hoặc Họ tên');
      return;
    }
    setIsLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/search`, {
        params: { query: searchTerm },
      });
      setUserInfo(res.data);
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
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/action`, {
        cccd: userInfo.user.cccd,
        licensePlate,
        action,
      });
      toast.success(`${action} xe thành công!`);
      const updatedVehicles = userInfo.user.vehicles.map((v) =>
        v.licensePlate === licensePlate
          ? {
              ...v,
              status: res.data.status,
              lastTransaction: { action, timestamp: res.data.timestamp },
            }
          : v
      );
      setUserInfo({ ...userInfo, user: { ...userInfo.user, vehicles: updatedVehicles } });
      fetchParkedVehicleCount();
    } catch (err) {
      toast.error(err.response?.data?.error || `Lỗi khi ${action.toLowerCase()} xe`);
    } finally {
      setIsLoading(false);
    }
  };

  const captureImageAndUpload = async () => {
    try {
      const video = document.querySelector('video');
      if (!video) {
        toast.error('Không tìm thấy video từ camera');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const formData = new FormData();
      formData.append('file', blob, 'snapshot.jpg');

      setIsLoading(true);
      const response = await axios.post('https://api.qrserver.com/v1/read-qr-code/', formData);
      const result = response.data[0]?.symbol[0];
      if (result?.error) {
        toast.error('Không đọc được mã QR từ ảnh');
        return;
      }
      const qrText = result?.data;
      if (qrText) {
        const userRes = await axios.post(`${process.env.REACT_APP_API_URL}/api/scan`, {
          qrString: qrText,
        });
        setUserInfo(userRes.data);
        toast.success('Đọc mã QR từ ảnh thành công!');
      }
    } catch (err) {
      toast.error('Lỗi khi đọc mã QR từ ảnh');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-3xl font-bold text-center text-primary mb-6">Quét QR để gửi/lấy xe</h1>
      <div className="mb-6 bg-white p-6 rounded-lg shadow-lg">
        <p className="text-center font-semibold text-lg mb-4">
          Số xe đang trong bãi: <span className="text-accent">{parkedVehicleCount}</span>
        </p>

        <div className="flex justify-center mb-4 space-x-4">
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
            className={`px-6 py-3 rounded-lg text-white font-medium transition ${
              isScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-blue-700'
            } ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? 'Đang tải...' : isScanning ? 'Dừng quét' : 'Bắt đầu quét'}
          </button>
          <button
            onClick={toggleFlash}
            disabled={!isScanning || isLoading}
            className={`px-6 py-3 rounded-lg text-white font-medium transition ${
              flashOn ? 'bg-yellow-500' : 'bg-gray-500'
            } ${!isScanning || isLoading ? 'opacity-50' : ''}`}
          >
            {flashOn ? 'Tắt Flash' : 'Bật Flash'}
          </button>
          <button
            onClick={captureImageAndUpload}
            disabled={isLoading}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg"
          >
            Chụp ảnh
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
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
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
