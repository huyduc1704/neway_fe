'use client';

import React from 'react';
import { Result, Button } from 'antd';
import { StopOutlined, PhoneOutlined } from '@ant-design/icons';

export default function Suspended() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full text-center border border-red-100">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
            <StopOutlined className="text-5xl text-red-500" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Hệ thống đang tạm ngưng
        </h1>
        
        <p className="text-gray-600 mb-8 text-base">
          Trang web này hiện đã bị tạm ngưng hoạt động. Vui lòng liên hệ với đơn vị phát triển hệ thống để biết thêm chi tiết và được hỗ trợ mở lại.
        </p>
        
        <div className="flex justify-center">
          <Button 
            type="primary" 
            size="large"
            danger
            icon={<PhoneOutlined />}
            className="flex items-center"
            onClick={() => window.location.href = 'mailto:contact@developer.com'}
          >
            Liên hệ nhà phát triển
          </Button>
        </div>
      </div>
    </div>
  );
}
