import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserInfo from './UserInfo';

const ScanPage = () => {
  const [qrData, setQrData] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const html5QrCodeRef = useRef(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode('qr-reader');
    }

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch((err) => {
          console.error('Failed to stop scanner on cleanup.', err);
        });
      }
    };
  }, []);

  useEffect(() => {
    const startScanner = async () => {
      if (!isScanning || html5QrCodeRef.current?.isScanning) return;
      setIsLoading(true);
      setError('');
      isStoppingRef.current = false;

      try {
        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 300, height: 300 },
            disableFlip: false,
          },
          async (decodedText) => {
            if (!isStoppingRef.current) {
              await handleScanSuccess(decodedText);
            }
          },
          (errorMessage) => {
            if (!errorMessage.includes('NotFoundException')) {
              console.error('QR Scan Error:', errorMessage);
            }
          }
        );
        setIsLoading(false);
      } catch (err) {
        setError('Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập.');
        toast.error('Lỗi camera: ' + err.message);
        setIsScanning(false);
        setIsLoading(false);
      }
    };

    const stopScanner = async () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        isStoppingRef.current = true;
        try {
          await html5QrCodeRef.current.stop();
        } catch (err) {
          console.error('Lỗi khi dừng quét:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    if (isScanning) {
      startScanner();
    } else {
      stopScanner();
    }
  }, [isScanning]);

  const handleScanSuccess = async (decodedText) => {
    setIsScanning(false);
    setQrData(decodedText);
    toast.success('Quét mã QR thành công!');
    await fetchUserInfo(decodedText);
  };

  const fetchUserInfo = async (qrString) => {
    setIsLoading(true);
    setUserInfo(null);
    try {
      const response = await axios.post('http://localhost:5000/api/scan', { qrString });
      setUserInfo(response.data);
      setError('');
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Lỗi server';
      setError(errorMessage);
      toast.error(errorMessage);
      setUserInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // =================================================================
  // HÀM ĐÃ ĐƯỢC SỬA LỖI - KHÔNG CẦN ĐĂNG NHẬP
  // =================================================================
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Vui lòng nhập số CCCD hoặc họ tên để tìm kiếm.');
      return;
    }

    setIsLoading(true);
    setError('');
    setUserInfo(null);

    try {
      // Gọi đến API công khai mới, không cần token
      const response = await axios.get(`http://localhost:5000/api/search`, {
        params: { query: searchQuery }
      });

      // API trả về trực tiếp đối tượng user, nên ta chỉ cần lấy nó
      setUserInfo(response.data);
      toast.success('Tìm kiếm thành công!');

    } catch (err) {
      // Bắt lỗi và hiển thị thông báo
      const errorMessage = err.response?.data?.error || 'Lỗi khi tìm kiếm';
      setError(errorMessage);
      toast.error(errorMessage);
      setUserInfo(null); // Xóa thông tin người dùng cũ nếu có lỗi
    } finally {
      setIsLoading(false);
    }
  };
  // =================================================================


  const handleAction = async (action, licensePlate) => {
    if (!userInfo?.user?.cccd || !licensePlate) return;
    setIsLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/action', {
        cccd: userInfo.user.cccd,
        licensePlate,
        action,
      });
      setUserInfo({
        ...userInfo,
        user: {
          ...userInfo.user,
          vehicles: userInfo.user.vehicles.map((v) =>
            v.licensePlate === licensePlate
              ? { ...v, status: response.data.status, lastTransaction: { action, timestamp: response.data.timestamp } }
              : v
          ),
        },
      });
      setError('');
      toast.success(`${action} xe thành công!`);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Lỗi khi thực hiện hành động';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScan = () => {
    if (!isScanning) {
      setUserInfo(null);
      setError('');
      setQrData(null);
      setSearchQuery('');
    }
    setIsScanning(!isScanning);
  };

  return (
    <div className="container mx-auto p-6 max-w-lg">
      <h1 className="text-3xl font-bold text-primary mb-6 text-center">Quét CCCD hoặc Tìm kiếm</h1>
      <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Nhập số CCCD hoặc họ tên"
            className="w-full p-2 border rounded-lg focus:ring-primary focus:border-primary"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className={`py-2 px-4 rounded-lg text-white font-medium transition-colors ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            Tìm kiếm
          </button>
        </div>
        <div id="qr-reader" className="w-full mb-4"></div>
        {isLoading && (
          <div className="flex justify-center mb-4">
            <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
        <button
          onClick={toggleScan}
          disabled={isLoading}
          className={`w-full py-3 rounded-lg text-white font-medium transition-colors ${
            isScanning ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-blue-700'
          } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isScanning ? 'Dừng quét' : 'Bắt đầu quét'}
        </button>
      </div>
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg text-center">
          {error}
        </div>
      )}
      {userInfo && (
        <UserInfo
          userInfo={userInfo}
          onAction={handleAction}
          isLoading={isLoading}
        />
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default ScanPage;