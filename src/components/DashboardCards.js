import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const DashboardCards = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVehicles: 0,
    parkedVehicles: 0,
    todayTransactions: 0,
    monthlyTransactions: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Lỗi khi tải thống kê dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const cards = [
    {
      title: 'Tổng người dùng',
      value: stats.totalUsers,
      icon: '👥',
      color: 'bg-blue-500',
      change: '+12%',
      changeType: 'positive'
    },
    {
      title: 'Tổng xe đăng ký',
      value: stats.totalVehicles,
      icon: '🚗',
      color: 'bg-green-500',
      change: '+8%',
      changeType: 'positive'
    },
    {
      title: 'Xe đang gửi',
      value: stats.parkedVehicles,
      icon: '🅿️',
      color: 'bg-yellow-500',
      change: '-3%',
      changeType: 'negative'
    },
    {
      title: 'Giao dịch hôm nay',
      value: stats.todayTransactions,
      icon: '📊',
      color: 'bg-purple-500',
      change: '+15%',
      changeType: 'positive'
    },
    {
      title: 'Giao dịch tháng',
      value: stats.monthlyTransactions,
      icon: '📈',
      color: 'bg-indigo-500',
      change: '+22%',
      changeType: 'positive'
    }
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2 mt-2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className={`${card.color} rounded-full p-3 text-white text-2xl`}>
              {card.icon}
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-medium text-gray-600">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`text-sm font-medium ${
              card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {card.change}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default DashboardCards;
