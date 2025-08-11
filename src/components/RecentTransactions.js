import React, { useState, useEffect } from 'react';
import axios from 'axios';

const formatLicensePlate = (plate) => {
  if (!plate) return '';
  const cleanPlate = plate.replace(/[-.]/g, '').toUpperCase();
  if (cleanPlate.includes('MĐ')) {
    const match = cleanPlate.match(/^(\d{2}MĐ\d)(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}-${match[2]}.${match[3]}`;
    }
  }
  if (cleanPlate.length === 8) {
    return `${cleanPlate.slice(0, 4)}-${cleanPlate.slice(4)}`;
  }
  if (cleanPlate.length === 9) {
    const match = cleanPlate.match(/^(\d{2}[A-Z]\d?)(\d{3})(\d{2})$/);
    if (match) {
      return `${match[1]}-${match[2]}.${match[3]}`;
    }
  }
  return plate;
};

const RecentTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentTransactions();
  }, []);

  const fetchRecentTransactions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/recent-transactions`);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Lỗi khi lấy lịch sử giao dịch:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-primary mb-4">Lịch sử giao dịch gần nhất</h3>
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-primary mb-4">Lịch sử giao dịch gần nhất</h3>
      {transactions.length === 0 ? (
        <p className="text-gray-500 text-center py-4">Chưa có giao dịch nào</p>
      ) : (
        <div className="space-y-3">
          {transactions.map((transaction, index) => (
            <div key={transaction.id} className="border-b border-gray-200 pb-3 last:border-b-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-accent">
                      {formatLicensePlate(transaction.licensePlate)}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      transaction.action === 'Gửi' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {transaction.action}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    CCCD: {transaction.cccd}
                  </p>
                  <p className="text-sm text-gray-500">
                    {transaction.formattedTime}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 text-center">
        <button
          onClick={fetchRecentTransactions}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Làm mới
        </button>
      </div>
    </div>
  );
};

export default RecentTransactions;
