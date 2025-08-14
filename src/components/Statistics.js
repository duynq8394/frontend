import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement } from 'chart.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const Statistics = ({ fullView = false }) => {
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
      setWeeklyData(response.data.weekly || []);
      setMonthlyData(response.data.monthly || []);
      setTotalParked(response.data.totalParked || 0);
      setTotalIn(response.data.totalIn || 0);
      setTotalOut(response.data.totalOut || 0);

      if (response.data.totalIn === 0 && response.data.totalOut === 0 && (startDate || endDate)) {
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

  const handleClearFilter = () => {
    setStartDate('');
    setEndDate('');
    fetchStatistics();
  };

  // Hàm helper để lấy số lượng xe theo trạng thái
  const getStatusCount = (item, targetStatus) => {
    if (!item.statuses || !Array.isArray(item.statuses)) return 0;
    const statusItem = item.statuses.find(s => s.status === targetStatus);
    return statusItem ? statusItem.count : 0;
  };

  // Hàm helper để kiểm tra xem có dữ liệu hay không
  const hasData = (data) => {
    return data && Array.isArray(data) && data.length > 0;
  };

  // Hàm helper để tạo label cho biểu đồ
  const createChartLabel = (item, period) => {
    if (period === 'week') {
      return item._id; // Giữ nguyên format tuần từ backend
    }
    
    try {
      const date = new Date(item._id);
      if (isNaN(date.getTime())) {
        return item._id; // Fallback nếu không parse được date
      }
      
      if (period === 'day') {
        return date.toLocaleDateString('vi-VN', { 
          day: '2-digit', 
          month: '2-digit'
        });
      } else if (period === 'month') {
        return date.toLocaleDateString('vi-VN', { 
          month: 'short', 
          year: '2-digit'
        });
      }
    } catch (error) {
      console.error('Error creating chart label:', error);
      return item._id;
    }
    
    return item._id;
  };

  // Tạo dữ liệu biểu đồ theo ngày
  const dailyChartData = {
    labels: dailyData.map((item) => createChartLabel(item, 'day')),
    datasets: [
      {
        label: 'Xe vào',
        data: dailyData.map((item) => getStatusCount(item, 'Đang gửi')),
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Xe ra',
        data: dailyData.map((item) => getStatusCount(item, 'Đã lấy')),
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  // Tạo dữ liệu biểu đồ theo tuần
  const weeklyChartData = {
    labels: weeklyData.map((item) => createChartLabel(item, 'week')),
    datasets: [
      {
        label: 'Xe vào',
        data: weeklyData.map((item) => getStatusCount(item, 'Đang gửi')),
        backgroundColor: '#3B82F6',
        borderColor: '#3B82F6',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Xe ra',
        data: weeklyData.map((item) => getStatusCount(item, 'Đã lấy')),
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  // Tạo dữ liệu biểu đồ theo tháng
  const monthlyChartData = {
    labels: monthlyData.map((item) => createChartLabel(item, 'month')),
    datasets: [
      {
        label: 'Xe vào',
        data: monthlyData.map((item) => getStatusCount(item, 'Đang gửi')),
        backgroundColor: '#8B5CF6',
        borderColor: '#8B5CF6',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Xe ra',
        data: monthlyData.map((item) => getStatusCount(item, 'Đã lấy')),
        backgroundColor: '#EC4899',
        borderColor: '#EC4899',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const summaryChartData = {
    labels: ['Xe đang gửi', 'Xe vào', 'Xe ra'],
    datasets: [
      {
        data: [totalParked, totalIn, totalOut],
        backgroundColor: [
          '#F59E0B', // Vàng cho xe đang gửi
          '#10B981', // Xanh lá cho xe vào
          '#EF4444', // Đỏ cho xe ra
        ],
        borderColor: [
          '#D97706',
          '#059669',
          '#DC2626',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Tạo biểu đồ đường cho xu hướng
  const trendChartData = {
    labels: dailyData.map((item) => createChartLabel(item, 'day')),
    datasets: [
      {
        label: 'Xu hướng xe vào',
        data: dailyData.map((item) => getStatusCount(item, 'Đang gửi')),
        borderColor: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#10B981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
      {
        label: 'Xu hướng xe ra',
        data: dailyData.map((item) => getStatusCount(item, 'Đã lấy')),
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#EF4444',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  // Kiểm tra xem có dữ liệu để hiển thị hay không
  const hasAnyData = totalParked > 0 || totalIn > 0 || totalOut > 0 || 
                     hasData(dailyData) || hasData(weeklyData) || hasData(monthlyData);

  return (
    <div className={fullView ? "bg-white rounded-lg shadow-lg p-6 max-w-7xl mx-auto" : "w-full"}>
      <h2 className={`font-semibold text-primary text-center ${fullView ? "text-2xl mb-6" : "text-xl mb-4"}`}>
        Thống kê xe vào/ra
      </h2>
      
      {/* Bộ lọc thời gian */}
      <div className={fullView ? "mb-6" : "mb-4"}>
        <div className={`flex flex-wrap gap-2 justify-center ${fullView ? "mb-4" : "mb-3"}`}>
          <button
            onClick={() => handlePeriodChange('day')}
            className={`rounded-lg transition-colors ${
              selectedPeriod === 'day' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${fullView ? "px-4 py-2" : "px-3 py-1 text-sm"}`}
          >
            Ngày
          </button>
          <button
            onClick={() => handlePeriodChange('week')}
            className={`rounded-lg transition-colors ${
              selectedPeriod === 'week' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${fullView ? "px-4 py-2" : "px-3 py-1 text-sm"}`}
          >
            Tuần
          </button>
          <button
            onClick={() => handlePeriodChange('month')}
            className={`rounded-lg transition-colors ${
              selectedPeriod === 'month' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            } ${fullView ? "px-4 py-2" : "px-3 py-1 text-sm"}`}
          >
            Tháng
          </button>
        </div>
        
        <form onSubmit={handleFilter} className={`flex flex-col sm:flex-row justify-center ${
          fullView ? "space-y-3 sm:space-y-0 sm:space-x-4" : "space-y-2 sm:space-y-0 sm:space-x-3"
        }`}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={`border rounded-lg focus:ring-primary focus:border-primary ${
              fullView ? "p-2" : "p-1 text-sm"
            }`}
            placeholder="Từ ngày"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={`border rounded-lg focus:ring-primary focus:border-primary ${
              fullView ? "p-2" : "p-1 text-sm"
            }`}
            placeholder="Đến ngày"
          />
          <button
            type="submit"
            className={`bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors ${
              fullView ? "px-4 py-2" : "px-3 py-1 text-sm"
            }`}
            disabled={isLoading}
          >
            Lọc
          </button>
          <button
            type="button"
            onClick={handleClearFilter}
            className={`bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors ${
              fullView ? "px-4 py-2" : "px-3 py-1 text-sm"
            }`}
            disabled={isLoading}
          >
            Xóa lọc
          </button>
        </form>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <svg className={`animate-spin text-primary ${fullView ? "h-8 w-8" : "h-6 w-6"}`} viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      ) : !hasAnyData ? (
        <div className={`text-center ${fullView ? "py-12" : "py-6"}`}>
          <div className={`mb-4 ${fullView ? "text-6xl" : "text-4xl"}`}>📊</div>
          <h3 className={`font-medium text-gray-700 mb-2 ${fullView ? "text-xl" : "text-lg"}`}>
            Chưa có dữ liệu thống kê
          </h3>
          <p className={`text-gray-500 ${fullView ? "" : "text-sm"}`}>
            Hãy thực hiện một số giao dịch gửi/lấy xe để xem thống kê
          </p>
        </div>
      ) : (
        <div className={fullView ? "space-y-8" : "space-y-4"}>
          {/* Thống kê tổng quan */}
          <div className={`grid gap-6 ${fullView ? "grid-cols-1 md:grid-cols-3" : "grid-cols-3 gap-3"}`}>
            <div className={`text-center bg-blue-50 rounded-lg ${fullView ? "p-4" : "p-3"}`}>
              <h3 className={`font-medium text-gray-700 mb-2 ${fullView ? "text-lg" : "text-sm"}`}>Xe đang gửi</h3>
              <div className={`font-bold text-primary ${fullView ? "text-4xl" : "text-2xl"}`}>{totalParked} xe</div>
              <p className={`text-gray-500 mt-1 ${fullView ? "text-sm" : "text-xs"}`}>
                {fullView ? "Hiện tại trong bãi" : "Hiện tại"}
              </p>
            </div>
            <div className={`text-center bg-green-50 rounded-lg ${fullView ? "p-4" : "p-3"}`}>
              <h3 className={`font-medium text-gray-700 mb-2 ${fullView ? "text-lg" : "text-sm"}`}>Xe vào</h3>
              <div className={`font-bold text-green-600 ${fullView ? "text-4xl" : "text-2xl"}`}>{totalIn} xe</div>
              <p className={`text-gray-500 mt-1 ${fullView ? "text-sm" : "text-xs"}`}>
                {fullView ? "Trong khoảng thời gian" : "Khoảng thời gian"}
              </p>
            </div>
            <div className={`text-center bg-red-50 rounded-lg ${fullView ? "p-4" : "p-3"}`}>
              <h3 className={`font-medium text-gray-700 mb-2 ${fullView ? "text-lg" : "text-sm"}`}>Xe ra</h3>
              <div className={`font-bold text-red-600 ${fullView ? "text-4xl" : "text-2xl"}`}>{totalOut} xe</div>
              <p className={`text-gray-500 mt-1 ${fullView ? "text-sm" : "text-xs"}`}>
                {fullView ? "Trong khoảng thời gian" : "Khoảng thời gian"}
              </p>
            </div>
          </div>

          {/* Biểu đồ tròn tổng quan */}
          <div className={`grid gap-8 ${fullView ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1 lg:grid-cols-2 gap-4"}`}>
            <div>
              <h3 className={`font-medium text-gray-700 mb-4 text-center ${fullView ? "text-lg" : "text-sm"}`}>
                Tổng quan hoạt động
              </h3>
              <div className="flex justify-center">
                <div className={fullView ? "w-64 h-64" : "w-48 h-48"}>
                  {totalParked > 0 || totalIn > 0 || totalOut > 0 ? (
                    <Doughnut
                      data={summaryChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            position: 'bottom', 
                            labels: { font: { size: fullView ? 12 : 10 } } 
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className={`flex items-center justify-center h-full text-gray-500 ${fullView ? "" : "text-sm"}`}>
                      {fullView ? "Không có dữ liệu hoạt động" : "Không có dữ liệu"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className={`font-medium text-gray-700 mb-4 text-center ${fullView ? "text-lg" : "text-sm"}`}>
                Xu hướng xe vào/ra
              </h3>
              <div className={fullView ? "h-64" : "h-48"}>
                {hasData(dailyData) ? (
                  <Line
                    data={trendChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { 
                          position: 'top', 
                          labels: { font: { size: fullView ? 12 : 10 } } 
                        },
                        title: { display: false },
                      },
                      scales: {
                        y: { 
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Số lượng xe',
                            font: { size: fullView ? 12 : 10 }
                          },
                          ticks: { font: { size: fullView ? 12 : 10 } }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Ngày',
                            font: { size: fullView ? 12 : 10 }
                          },
                          ticks: { font: { size: fullView ? 12 : 10 } }
                        }
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      }
                    }}
                  />
                ) : (
                  <div className={`flex items-center justify-center h-full text-gray-500 ${fullView ? "" : "text-sm"}`}>
                    Không có dữ liệu xu hướng
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Biểu đồ theo thời gian được chọn */}
          <div>
            <h3 className={`font-medium text-gray-700 mb-4 text-center ${fullView ? "text-lg" : "text-sm"}`}>
              {selectedPeriod === 'day' ? 'Số xe vào/ra theo ngày' : 
               selectedPeriod === 'week' ? 'Số xe vào/ra theo tuần' : 
               'Số xe vào/ra theo tháng'}
            </h3>
            {(() => {
              const currentData = selectedPeriod === 'day' ? dailyData : 
                                 selectedPeriod === 'week' ? weeklyData : 
                                 monthlyData;
              
              if (!hasData(currentData)) {
                return (
                  <div className={`text-center text-gray-500 ${fullView ? "py-8" : "py-4"} ${fullView ? "" : "text-sm"}`}>
                    Không có dữ liệu cho {selectedPeriod === 'day' ? 'ngày' : 
                                        selectedPeriod === 'week' ? 'tuần' : 'tháng'} này
                  </div>
                );
              }
              
              const chartData = selectedPeriod === 'day' ? dailyChartData : 
                               selectedPeriod === 'week' ? weeklyChartData : 
                               monthlyChartData;
              
              return (
                <div className={fullView ? "" : "h-64"}>
                  <Bar
                    data={chartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: !fullView,
                      plugins: {
                        legend: { 
                          position: 'top', 
                          labels: { font: { size: fullView ? 12 : 10 } } 
                        },
                        title: { display: false },
                      },
                      scales: {
                        x: { 
                          stacked: false,
                          title: {
                            display: true,
                            text: selectedPeriod === 'day' ? 'Ngày' : 
                                   selectedPeriod === 'week' ? 'Tuần' : 'Tháng',
                            font: { size: fullView ? 12 : 10 }
                          },
                          ticks: { font: { size: fullView ? 12 : 10 } }
                        },
                        y: { 
                          stacked: false, 
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Số lượng xe',
                            font: { size: fullView ? 12 : 10 }
                          },
                          ticks: { font: { size: fullView ? 12 : 10 } }
                        },
                      },
                      interaction: {
                        intersect: false,
                        mode: 'index'
                      }
                    }}
                  />
                </div>
              );
            })()}
          </div>

          {/* Thông tin bổ sung - chỉ hiển thị trong full view */}
          {fullView && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-2 text-center">Thông tin thống kê</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-blue-600 font-medium">Xe đang gửi:</span> {totalParked} xe
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-green-600 font-medium">Xe vào:</span> {totalIn} xe
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <span className="text-red-600 font-medium">Xe ra:</span> {totalOut} xe
                </div>
              </div>
              <div className="mt-4 text-center text-sm text-gray-600">
                <p>• <strong>Xe đang gửi:</strong> Số xe hiện tại đang trong bãi</p>
                <p>• <strong>Xe vào:</strong> Số giao dịch gửi xe trong khoảng thời gian</p>
                <p>• <strong>Xe ra:</strong> Số giao dịch lấy xe trong khoảng thời gian</p>
              </div>
              {!hasData(dailyData) && (
                <div className="text-center mt-4 text-gray-500">
                  Không có dữ liệu giao dịch trong khoảng thời gian này
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Statistics; 