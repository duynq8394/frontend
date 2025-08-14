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

  // Hàm xử lý timestamp - chuyển đổi từ UTC sang Vietnam time (+7)
  const processTimestamp = (timestamp) => {
    if (!timestamp) return new Date();
    // Chuyển đổi từ UTC sang Vietnam time (+7)
    const date = new Date(timestamp);
    const vietnamTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    return vietnamTime;
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
      
      // Xử lý dữ liệu với timezone +7
      const processedDailyData = (response.data.daily || []).map(item => ({
        ...item,
        _id: new Date(item._id + 'T00:00:00.000Z') // Chuyển đổi string date thành Date object
      }));
      
      const processedWeeklyData = (response.data.weekly || []).map(item => ({
        ...item,
        _id: item._id // Giữ nguyên format tuần
      }));
      
      const processedMonthlyData = (response.data.monthly || []).map(item => ({
        ...item,
        _id: new Date(item._id + '-01T00:00:00.000Z') // Chuyển đổi string month thành Date object
      }));

      console.log('Processed daily data:', processedDailyData);
      console.log('Processed weekly data:', processedWeeklyData);
      console.log('Processed monthly data:', processedMonthlyData);

      setDailyData(processedDailyData);
      setWeeklyData(processedWeeklyData);
      setMonthlyData(processedMonthlyData);
      setTotalParked(response.data.totalParked || 0);

      // Sử dụng dữ liệu từ backend thay vì tính toán lại
      const totalInCount = response.data.totalInMonth || 0;
      const totalOutCount = response.data.totalOutMonth || 0;
      
      console.log('Total In Count (from backend):', totalInCount);
      console.log('Total Out Count (from backend):', totalOutCount);
      
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
        label: 'Số xe gửi',
        data: dailyData.map((item) => getStatusCount(item, 'Đang gửi')),
        backgroundColor: '#1E40AF',
        borderColor: '#1E40AF',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Số xe lấy',
        data: dailyData.map((item) => getStatusCount(item, 'Đã lấy')),
        backgroundColor: '#10B981',
        borderColor: '#10B981',
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
        label: 'Số xe gửi',
        data: weeklyData.map((item) => getStatusCount(item, 'Đang gửi')),
        backgroundColor: '#F59E0B',
        borderColor: '#F59E0B',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Số xe lấy',
        data: weeklyData.map((item) => getStatusCount(item, 'Đã lấy')),
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
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
        label: 'Số xe gửi',
        data: monthlyData.map((item) => getStatusCount(item, 'Đang gửi')),
        backgroundColor: '#10B981',
        borderColor: '#10B981',
        borderWidth: 2,
        tension: 0.4,
      },
      {
        label: 'Số xe lấy',
        data: monthlyData.map((item) => getStatusCount(item, 'Đã lấy')),
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
        borderWidth: 2,
        tension: 0.4,
      },
    ],
  };

  const summaryChartData = {
    labels: ['Xe đang gửi', 'Xe gửi tháng này', 'Xe lấy tháng này'],
    datasets: [
      {
        data: [totalParked, totalIn, totalOut],
        backgroundColor: [
          '#F59E0B', // Vàng cho xe đang gửi
          '#1E40AF', // Xanh dương cho xe gửi tháng này
          '#10B981', // Xanh lá cho xe lấy tháng này
        ],
        borderColor: [
          '#D97706',
          '#1E40AF',
          '#059669',
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
        label: 'Xu hướng xe gửi',
        data: dailyData.map((item) => getStatusCount(item, 'Đang gửi')),
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

  // Kiểm tra xem có dữ liệu để hiển thị hay không
  const hasAnyData = totalParked > 0 || totalIn > 0 || totalOut > 0 || 
                     hasData(dailyData) || hasData(weeklyData) || hasData(monthlyData);

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
      ) : !hasAnyData ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-medium text-gray-700 mb-2">Chưa có dữ liệu thống kê</h3>
          <p className="text-gray-500">Hãy thực hiện một số giao dịch gửi/lấy xe để xem thống kê</p>
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
              <h3 className="text-lg font-medium text-gray-700 mb-2">Xe gửi tháng này</h3>
              <div className="text-4xl font-bold text-green-600">{totalIn} xe</div>
            </div>
            <div className="text-center bg-red-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Xe lấy tháng này</h3>
              <div className="text-4xl font-bold text-red-600">{totalOut} xe</div>
            </div>
          </div>
          
          {totalParked === 0 && totalIn === 0 && totalOut === 0 && (
            <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
              Chưa có dữ liệu giao dịch nào trong hệ thống
            </div>
          )}

          {/* Biểu đồ tròn tổng quan */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Tổng quan hoạt động</h3>
              <div className="flex justify-center">
                <div className="w-64 h-64">
                  {totalParked > 0 || totalIn > 0 || totalOut > 0 ? (
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
                                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : 0;
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                              }
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      Không có dữ liệu hoạt động
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-4 text-center">Xu hướng gửi xe</h3>
              <div className="h-64">
                {hasData(dailyData) ? (
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
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    Không có dữ liệu xu hướng
                  </div>
                )}
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
            {(() => {
              const currentData = selectedPeriod === 'day' ? dailyData : 
                                 selectedPeriod === 'week' ? weeklyData : 
                                 monthlyData;
              
              if (!hasData(currentData)) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    Không có dữ liệu cho {selectedPeriod === 'day' ? 'ngày' : 
                                        selectedPeriod === 'week' ? 'tuần' : 'tháng'} này
                  </div>
                );
              }
              
              const chartData = selectedPeriod === 'day' ? dailyChartData : 
                               selectedPeriod === 'week' ? weeklyChartData : 
                               monthlyChartData;
              
              return (
                <Bar
                  data={chartData}
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
              );
            })()}
          </div>

          {/* Thông tin bổ sung */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-700 mb-2 text-center">Thống kê theo khoảng thời gian</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div className="bg-white p-3 rounded-lg">
                <span className="text-green-600 font-medium">Tổng xe gửi tháng này:</span> {totalIn} xe
              </div>
              <div className="bg-white p-3 rounded-lg">
                <span className="text-red-600 font-medium">Tổng xe lấy tháng này:</span> {totalOut} xe
              </div>
            </div>
            {!hasData(dailyData) && (
              <div className="text-center mt-4 text-gray-500">
                Không có dữ liệu giao dịch trong tháng này
              </div>
            )}
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
  };
  
export default Statistics;