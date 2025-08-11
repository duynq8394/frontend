import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement } from 'chart.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement);

const Statistics = () => {
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [totalParked, setTotalParked] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month'); // 'week', 'month', 'year'

  useEffect(() => {
    fetchStatistics();
  }, [selectedPeriod]);

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
      setDailyData(response.data.daily || []);
      setMonthlyData(response.data.monthly || []);
      setTotalParked(response.data.totalParked || 0);

      // Tính tổng số xe vào/ra
      const totalInCount = response.data.daily.reduce((sum, item) => {
        const sendAction = item.actions && Array.isArray(item.actions)
          ? item.actions.find((a) => a.action === 'Gửi')
          : null;
        return sum + (sendAction ? sendAction.count : 0);
      }, 0);
      const totalOutCount = response.data.daily.reduce((sum, item) => {
        const retrieveAction = item.actions && Array.isArray(item.actions)
          ? item.actions.find((a) => a.action === 'Lấy')
          : null;
        return sum + (retrieveAction ? retrieveAction.count : 0);
      }, 0);
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

  const dailyChartData = {
    labels: dailyData.map((item) => {
      const date = new Date(item._id);
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
          const sendAction = item.actions && Array.isArray(item.actions)
            ? item.actions.find((a) => a.action === 'Gửi')
            : null;
          return sendAction ? sendAction.count : 0;
        }),
        backgroundColor: '#1E40AF',
        borderColor: '#1E40AF',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const monthlyChartData = {
    labels: monthlyData.map((item) => {
      const date = new Date(item._id);
      return date.toLocaleDateString('vi-VN', { 
        month: 'short', 
        year: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
      });
    }),
    datasets: [
      {
        label: 'Số xe vào',
        data: monthlyData.map((item) => {
          const sendAction = item.actions && Array.isArray(item.actions)
            ? item.actions.find((a) => a.action === 'Gửi')
            : null;
          return sendAction ? sendAction.count : 0;
        }),
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Số xe ra',
        data: monthlyData.map((item) => {
          const retrieveAction = item.actions && Array.isArray(item.actions)
            ? item.actions.find((a) => a.action === 'Lấy')
            : null;
          return retrieveAction ? retrieveAction.count : 0;
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



  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold text-primary mb-6 text-center">Thống kê gửi/lấy xe</h2>
      
      {/* Bộ lọc thời gian */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4 justify-center">
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
          <button
            onClick={() => handlePeriodChange('year')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedPeriod === 'year' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Năm
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
              <h3 className="text-lg font-medium text-gray-700 mb-2">Xe vào hôm nay</h3>
              <div className="text-4xl font-bold text-green-600">{totalIn} xe</div>
            </div>
            <div className="text-center bg-red-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Xe ra hôm nay</h3>
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


          </div>

          {/* Biểu đồ cột */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Số xe vào/ra theo tháng</h3>
            <Bar
              data={monthlyChartData}
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
                      text: 'Tháng'
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

          {/* Biểu đồ cột theo ngày */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Số xe gửi theo ngày</h3>
            <Bar
              data={dailyChartData}
              options={{
                responsive: true,
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

          {/* Thông tin bổ sung */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-2 text-center">Thống kê theo khoảng thời gian</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div className="bg-white p-3 rounded-lg">
                <span className="text-green-600 font-medium">Tổng xe vào:</span> {totalIn} xe
              </div>
              <div className="bg-white p-3 rounded-lg">
                <span className="text-red-600 font-medium">Tổng xe ra:</span> {totalOut} xe
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