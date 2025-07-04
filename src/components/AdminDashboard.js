import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import VehicleList from './VehicleList';
import Statistics from './Statistics';
import AddUser from './AddUser';
import { ToastContainer, toast } from 'react-toastify';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [showAddUser, setShowAddUser] = useState(false);

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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        <div className="space-x-4">
          <button
            onClick={() => setShowAddUser(true)}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-yellow-600"
          >
            Thêm người dùng
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Đăng xuất
          </button>
        </div>
      </div>
      {showAddUser && <AddUser onSave={handleAddUser} />}
      <div className="space-y-6">
        <VehicleList />
        <Statistics />
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default AdminDashboard;