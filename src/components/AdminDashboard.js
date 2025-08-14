import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VehicleList from './VehicleList';
import VehicleListCompact from './VehicleListCompact';
import Statistics from './Statistics';
import AddUser from './AddUser';
import DashboardCards from './DashboardCards';
import UserManagement from './UserManagement';
import InventorySummary from './InventorySummary';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [showAddUser, setShowAddUser] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      toast.error('Vui lòng đăng nhập!');
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    toast.success('Đăng xuất thành công!');
    navigate('/admin/login');
  };

  const handleAddUser = () => {
    setShowAddUser(false);
  };

  const tabs = [
    { id: 'overview', name: 'Tổng quan', icon: '📊' },
    { id: 'vehicles', name: 'Quản lý xe', icon: '🚗' },
    { id: 'users', name: 'Quản lý người dùng', icon: '👥' },
    { id: 'statistics', name: 'Thống kê', icon: '📈' },
    { id: 'inventory', name: 'Kiểm kê', icon: '🔍' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddUser(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="mr-2">➕</span>
                Thêm người dùng
              </button>
              <button
                onClick={() => navigate('/admin/inventory')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <span className="mr-2">🔍</span>
                Kiểm kê biển số
              </button>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <span className="mr-2">🚪</span>
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showAddUser && (
          <div className="mb-8">
            <AddUser onSave={handleAddUser} />
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Thống kê tổng quan</h3>
                <DashboardCards />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Thống kê xe vào/ra</h3>
                  <Statistics />
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Danh sách xe gần đây</h3>
                  <VehicleListCompact />
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Thống kê kiểm kê</h3>
                  <InventorySummary />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div className="bg-white rounded-lg shadow">
              <VehicleList />
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-lg shadow p-6">
              <UserManagement />
            </div>
          )}

          {activeTab === 'statistics' && (
            <div>
              <Statistics fullView={true} />
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quản Lý Kiểm Kê Biển Số Xe</h3>
                <p className="text-gray-600 mb-6">
                  Chức năng kiểm kê cho phép bạn tìm kiếm và ghi nhận các biển số xe trong hệ thống.
                  Mỗi lần kiểm kê sẽ được ghi nhận với bộ đếm tăng dần.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Tính năng chính:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Tìm kiếm biển số theo 4-5 số cuối</li>
                      <li>• Ghi nhận kiểm kê với bộ đếm</li>
                      <li>• Quản lý phiên kiểm kê</li>
                      <li>• Báo cáo tổng hợp</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">Hướng dẫn sử dụng:</h4>
                    <ul className="text-sm text-green-800 space-y-1">
                      <li>• Bắt đầu phiên kiểm kê mới</li>
                      <li>• Tìm kiếm và chọn biển số</li>
                      <li>• Kết thúc để xem báo cáo</li>
                      <li>• Xuất danh sách chưa kiểm kê</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    onClick={() => navigate('/admin/inventory')}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                  >
                    <span className="mr-2">🔍</span>
                    Mở Trang Kiểm Kê
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastContainer 
        position="top-right" 
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default AdminDashboard;