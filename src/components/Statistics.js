import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Statistics = () => {
  const [dailyData, setDailyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [totalParked, setTotalParked] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) throw new Error('Không tìm thấy token admin');
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await axios.get('http://localhost:5000/api/admin/statistics', {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('API /statistics response:', response.data); // Log để gỡ lỗi
      setDailyData(response.data.daily || []);
      setMonthlyData(response.data.monthly || []);
      setTotalParked(response.data.totalParked || 0);

      // Tính tổng số xe vào/ra
      const totalInCount = response.data.monthly.reduce((sum, item) => {
        const sendAction = item.actions && Array.isArray(item.actions)
          ? item.actions.find((a) => a.action === 'Gửi')
          : null;
        return sum + (sendAction ? sendAction.count : 0);
      }, 0);
      const totalOutCount = response.data.monthly.reduce((sum, item) => {
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

  const dailyChartData = {
    labels: dailyData.map((item) => item._id || 'N/A'),
    datasets: [
      {
        label: 'Số xe gửi',
        data: dailyData.map((item) => item.count || 0),
        backgroundColor: '#1E40AF',
        borderColor: '#1E40AF',
        borderWidth: 1,
      },
    ],
  };

  const monthlyChartData = {
    labels: monthlyData.map((item) => item._id || 'N/A'),
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
        borderWidth: 1,
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
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-primary mb-6 text-center">Thống kê gửi/lấy xe</h2>
      <form onSubmit={handleFilter} className="mb-6 flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 justify-center">
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
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Tổng số xe đang gửi</h3>
            <div className="text-4xl font-bold text-primary">{totalParked} xe</div>
          </div>
          {(startDate || endDate) && (
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-700 mb-2">Tổng số xe trong khoảng thời gian</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-green-600 font-medium">Số xe vào:</span> {totalIn} xe
                </div>
                <div>
                  <span className="text-red-600 font-medium">Số xe ra:</span> {totalOut} xe
                </div>
              </div>
            </div>
          )}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Số xe gửi theo ngày</h3>
            <Bar
              data={dailyChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Thống kê xe gửi theo ngày' },
                },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Số xe vào/ra theo tháng</h3>
            <Bar
              data={monthlyChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: true, text: 'Thống kê xe vào/ra theo tháng' },
                },
                scales: {
                  x: { stacked: false },
                  y: { stacked: false, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      )}
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default Statistics;