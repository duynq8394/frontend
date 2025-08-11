import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ToastContainer, toast } from 'react-toastify';
import axios from 'axios';
import UserInfo from './UserInfo';
import RecentTransactions from './RecentTransactions';
import CombinedSearch from './CombinedSearch';
import { useNavigate } from 'react-router-dom';

const ScanPage = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parkedVehicleCount, setParkedVehicleCount] = useState(0);
  const [showRecentTransactions, setShowRecentTransactions] = useState(false);
  const html5QrCodeRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    html5QrCodeRef.current = new Html5Qrcode('qr-reader');
    fetchParkedVehicleCount();

    return () => {
      stopScanner();
    };
  }, []);

  // Reset scanner khi component unmount hoặc khi userInfo thay đổi
  useEffect(() => {
    if (userInfo) {
      // Reset scanner để có thể quét lại
      stopScanner();
      setIsScanning(false);
    }
  }, [userInfo]);

  const fetchParkedVehicleCount = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/public/parked-vehicles`);
      setParkedVehicleCount(response.data.totalParked || 0);
    } catch (err) {
      console.error('Lỗi khi lấy số xe đang gửi:', err);
      setParkedVehicleCount(0);
    }
  };

  const startScanner = async () => {
    const qrCodeScanner = html5QrCodeRef.current;
    try {
      setIsLoading(true);
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        toast.error('Không tìm thấy camera');
        return;
      }

      await qrCodeScanner.start(
        { facingMode: 'environment' },
        {
          fps: 24,
          qrbox: { width: 250, height: 250 }, // tăng vùng quét
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          if (!decodedText) return;
          await qrCodeScanner.stop(); // Dừng hoàn toàn scanner thay vì pause
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
    } catch (err) {
      toast.error('Không thể khởi động camera: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanner = async () => {
    const qrCodeScanner = html5QrCodeRef.current;
    if (qrCodeScanner?.getState() === 2) {
      try {
        await qrCodeScanner.stop();
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

    return () => {
      stopScanner();
    };
  }, [isScanning]);

  const handleAction = async (action, licensePlate) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/action`, {
        cccd: userInfo.user.cccd,
        licensePlate,
        action,
      });
      toast.success(`${action} xe thành công!`);
      const updatedVehicles = userInfo.user.vehicles.map((v) =>
        v.licensePlate === licensePlate
          ? {
              ...v,
              status: response.data.status,
              lastTransaction: { action, timestamp: response.data.timestamp },
            }
          : v
      );
      setUserInfo({ ...userInfo, user: { ...userInfo.user, vehicles: updatedVehicles } });
      fetchParkedVehicleCount();
      // Cập nhật lịch sử giao dịch
      setShowRecentTransactions(true);
    } catch (err) {
      toast.error(err.response?.data?.error || `Lỗi khi ${action.toLowerCase()} xe`);
    } finally {
      setIsLoading(false);
    }
  };



  const handleUserSelect = (userData) => {
    setUserInfo(userData);
  };

  const handleVehicleSelect = async (vehicle) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/search`, {
        params: { query: vehicle.ownerCccd },
      });
      setUserInfo(response.data);
      toast.success('Đã chọn xe thành công!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi khi tìm thông tin xe');
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
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={() => navigate('/admin/login')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700"
          >
            Đăng nhập Admin
          </button>
          <button
            onClick={() => setShowRecentTransactions(!showRecentTransactions)}
            className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-green-700"
          >
            {showRecentTransactions ? 'Ẩn lịch sử' : 'Xem lịch sử'}
          </button>
        </div>
        <div id="qr-reader" style={{ width: '100%', display: isScanning ? 'block' : 'none' }}></div>
                          <div className="flex justify-center mb-4">
           <button
             onClick={() => setIsScanning(!isScanning)}
             disabled={isLoading}
             className={`px-6 py-3 rounded-lg text-white font-medium transition-colors ${
               isScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-blue-700'
             } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
           >
             {isLoading ? 'Đang tải Camera...' : isScanning ? 'Dừng quét' : 'Bắt đầu quét'}
           </button>
         </div>
      </div>
      
             {/* Tìm kiếm kết hợp */}
       <div className="mb-6">
         <CombinedSearch onUserSelect={handleUserSelect} onVehicleSelect={handleVehicleSelect} />
       </div>

       {/* Thông tin người dùng */}
       {userInfo && <UserInfo userInfo={userInfo} onAction={handleAction} isLoading={isLoading} />}

       {/* Lịch sử giao dịch gần nhất */}
       {showRecentTransactions && (
         <div className="mb-6">
           <RecentTransactions />
         </div>
       )}
    </div>
  );
};

export default ScanPage;
