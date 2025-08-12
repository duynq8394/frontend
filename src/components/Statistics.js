import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const Statistics = () => {
  const [dailyData, setDailyData] = useState([]);
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [totalParked, setTotalParked] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // 'day', 'week', 'month'

  useEffect(() => {
    fetchStatistics();
  }, [selectedPeriod]);

  // Hàm chuyển đổi timezone từ UTC sang +7 (không cần thiết nữa vì backend đã lưu +7)
  const convertToVietnamTime = (utcDate) => {
    if (!utcDate) return new Date();
    const date = new Date(utcDate);
    // Timestamp từ MongoDB đã là Vietnam time (+7), chỉ cần parse
    return date;
  };

  const fetchStatistics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Không tìm thấy token admin');
      
      const params = { period: selectedPeriod };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/statistics`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('API /statistics response:', response.data);
      console.log('Daily data:', response.data.daily);
      console.log('Weekly data:', response.data.weekly);
      console.log('Monthly data:', response.data.monthly);
      
      // Xử lý dữ liệu với timezone +7
      const processedDailyData = (response.data.daily || []).map(item => ({
        ...item,
        _id: convertToVietnamTime(item._id)
      }));
      
      const processedWeeklyData = (response.data.weekly || []).map(item => ({
        ...item,
        _id: convertToVietnamTime(item._id)
      }));
      
      const processedMonthlyData = (response.data.monthly || []).map(item => ({
        ...item,
        _id: convertToVietnamTime(item._id)
      }));

      console.log('Processed daily data:', processedDailyData);
      console.log('Processed weekly data:', processedWeeklyData);
      console.log('Processed monthly data:', processedMonthlyData);

      setDailyData(processedDailyData);
      setWeeklyData(processedWeeklyData);
      setMonthlyData(processedMonthlyData);
      setTotalParked(response.data.totalParked || 0);

      // Tính tổng số xe vào/ra dựa trên TRẠNG THÁI thay vì action
      // Xe gửi: Số xe có trạng thái "Đang gửi" với ngày hôm nay
      // Xe lấy: Số xe có trạng thái "Đã lấy" với ngày hôm nay
      const totalInCount = processedDailyData.reduce((sum, item) => {
        const parkedStatus = item.statuses && Array.isArray(item.statuses)
          ? item.statuses.find((s) => s.status === 'Đang gửi')
          : null;
        console.log(`Date: ${item._id}, Statuses:`, item.statuses, 'Found parked status:', parkedStatus);
        return sum + (parkedStatus ? parkedStatus.count : 0);
      }, 0);
      
      const totalOutCount = processedDailyData.reduce((sum, item) => {
        const retrievedStatus = item.statuses && Array.isArray(item.statuses)
          ? item.statuses.find((s) => s.status === 'Đã lấy')
          : null;
        console.log(`Date: ${item._id}, Statuses:`, item.statuses, 'Found retrieved status:', retrievedStatus);
        return sum + (retrievedStatus ? retrievedStatus.count : 0);
      }, 0);
      
      console.log('Total In Count:', totalInCount);
      console.log('Total Out Count:', totalOutCount);
      
      setTotalIn(totalInCount);
      setTotalOut(totalOutCount);

      if (totalInCount === 0 && totalOutCount === 0 && (startDate || endDate)) {
        toast.info('Không có dữ liệu giao dịch trong khoảng thời gian này.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Lỗi khi lấy thống kê: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = (e) => {
    e.preventDefault();
    fetchStatistics();
  };

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  // Tạo dữ liệu biểu đồ theo ngày
  const dailyChartData = {
    labels: dailyData.map((item) => {
      const date = convertToVietnamTime(item._id);
      return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
    }),
    datasets: [
      {
        label: 'Số xe gửi',
        data: dailyData.map((item) => {
          const parkedStatus = item.statuses && Array.isArray(item.statuses)
            ? item.statuses.find((s) => s.status === 'Đang gửi')
            : null;
          return parkedStatus ? parkedStatus.count : 0;
        }),
        backgroundColor: '#1E40AF',
        borderColor: '#1E40AF',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Số xe lấy',
        data: dailyData.map((item) => {
          const retrievedStatus = item.statuses && Array.isArray(item.statuses)
            ? item.statuses.find((s) => s.status === 'Đã lấy')
            : null;
          return retrievedStatus ? retrievedStatus.count : 0;
        }),
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  // Tạo dữ liệu biểu đồ theo tuần
  const weeklyChartData = {
    labels: weeklyData.map((item) => {
      const date = convertToVietnamTime(item._id);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      return `${weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
    }),
    datasets: [
      {
        label: 'Số xe gửi',
        data: weeklyData.map((item) => {
          const parkedStatus = item.statuses && Array.isArray(item.statuses)
            ? item.statuses.find((s) => s.status === 'Đang gửi')
            : null;
          return parkedStatus ? parkedStatus.count : 0;
        }),
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Số xe lấy',
        data: weeklyData.map((item) => {
          const retrievedStatus = item.statuses && Array.isArray(item.statuses)
            ? item.statuses.find((s) => s.status === 'Đã lấy')
            : null;
          return retrievedStatus ? retrievedStatus.count : 0;
        }),
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  // Tạo dữ liệu biểu đồ theo tháng
  const monthlyChartData = {
    labels: monthlyData.map((item) => {
      const date = convertToVietnamTime(item._id);
      return date.toLocaleDateString('vi-VN', { 
        month: 'short', 
        year: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
    }),
    datasets: [
      {
        label: 'Số xe gửi',
        data: monthlyData.map((item) => {
          const parkedStatus = item.statuses && Array.isArray(item.statuses)
            ? item.statuses.find((s) => s.status === 'Đang gửi')
            : null;
          return parkedStatus ? parkedStatus.count : 0;
        }),
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Số xe lấy',
        data: monthlyData.map((item) => {
          const retrievedStatus = item.statuses && Array.isArray(item.statuses)
            ? item.statuses.find((s) => s.status === 'Đã lấy')
            : null;
          return retrievedStatus ? retrievedStatus.count : 0;
        }),
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const summaryChartData = {
    labels: ['Xe đang gửi', 'Xe đã lấy hôm nay', 'Tổng giao dịch hôm nay'],
    datasets: [
      {
        data: [totalParked, totalOut, totalIn + totalOut],
        backgroundColor: [
          '#F59E0B', // Vàng cho xe đang gửi
          '#10B981', // Xanh lá cho xe đã lấy
          '#3B82F6', // Xanh dương cho tổng giao dịch
        ],
        borderColor: [
          '#D97706',
          '#059669',
          '#2563EB',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Tạo biểu đồ đường cho xu hướng
  const trendChartData = {
    labels: dailyData.map((item) => {
      const date = convertToVietnamTime(item._id);
      return date.toLocaleDateString('vi-VN', { 
        day: '2-digit', 
        month: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
    }),
    datasets: [
      {
        label: 'Xu hướng xe gửi',
        data: dailyData.map((item) => {
          const parkedStatus = item.statuses && Array.isArray(item.statuses)
            ? item.statuses.find((s) => s.status === 'Đang gửi')
            : null;
          return parkedStatus ? parkedStatus.count : 0;
        }),
        borderColor: '#1E40AF',
        backgroundColor: 'rgba(30, 64, 175, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#1E40AF',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold text-primary mb-6 text-center">Thống kê gửi/lấy xe</h2>
      
      {/* Bộ lọc thời gian */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
          <button
            onClick={() => handlePeriodChange('day')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPeriod === 'day' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Ngày
          </button>
          <button
            onClick={() => handlePeriodChange('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPeriod === 'week' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tuần
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPeriod === 'month' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tháng
          </button>
        </div>
        
        <form onSubmit={handleFilter} className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-2 border rounded-lg focus:ring-primary focus:border-primary"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-2 border rounded-lg focus:ring-primary focus:border-primary"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
            disabled={isLoading}
          >
            Lọc
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Thống kê tổng quan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Xe đang gửi</h3>
              <div className="text-4xl font-bold text-primary">{totalParked} xe</div>
            </div>
            <div className="text-center bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Xe gửi hôm nay</h3>
              <div className="text-4xl font-bold text-green-600">{totalIn} xe</div>
            </div>
            <div className="text-center bg-red-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Xe lấy hôm nay</h3>
              <div className="text-4xl font-bold text-red-600">{totalOut} xe</div>
            </div>
          </div>

          {/* Biểu đồ tròn tổng quan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Tổng quan hoạt động</h3>
              <div className="flex justify-center">
                <div className="w-64 h-64">
                  <Doughnut
                    data={summaryChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const total = context.dataset.data.reduce((a, b) => a + b, 0);
                              const percentage = ((context.parsed / total) * 100).toFixed(1);
                              return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Xu hướng gửi xe</h3>
              <div className="h-64">
                <Line
                  data={trendChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top' },
                      title: { display: false },
                    },
                    scales: {
                      y: { 
                        beginAtZero: true,
                        title: {
                          display: true,
                          text: 'Số lượng xe'
                        }
                      },
                      x: {
                        title: {
                          display: true,
                          text: 'Ngày'
                        }
                      }
                    },
                    interaction: {
                      intersect: false,
                      mode: 'index'
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Biểu đồ theo thời gian được chọn */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">
              {selectedPeriod === 'day' ? 'Số xe gửi/lấy theo ngày' : 
               selectedPeriod === 'week' ? 'Số xe gửi/lấy theo tuần' : 
               'Số xe gửi/lấy theo tháng'}
            </h3>
            <Bar
              data={selectedPeriod === 'day' ? dailyChartData : 
                    selectedPeriod === 'week' ? weeklyChartData : 
                    monthlyChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false },
                },
                scales: {
                  x: { 
                    stacked: false,
                    title: {
                      display: true,
                      text: selectedPeriod === 'day' ? 'Ngày' : 
                             selectedPeriod === 'week' ? 'Tuần' : 'Tháng'
                    }
                  },
                  y: { 
                    stacked: false, 
                    beginAtZero: true,
                    title: {
                      display: true,
                      text: 'Số lượng xe'
                    }
                  },
                },
                interaction: {
                  intersect: false,
                  mode: 'index'
                }
              }}
            />
          </div>

          {/* Thông tin bổ sung */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-2 text-center">Thống kê theo khoảng thời gian</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div className="bg-white p-3 rounded-lg">
                <span className="text-green-600 font-medium">Tổng xe gửi:</span> {totalIn} xe
              </div>
              <div className="bg-white p-3 rounded-lg">
                <span className="text-red-600 font-medium">Tổng xe lấy:</span> {totalOut} xe
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Statistics;