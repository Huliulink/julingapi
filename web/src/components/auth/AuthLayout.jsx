import React from 'react';
import { useActualTheme } from '../../context/Theme';

const AuthLayout = ({ children }) => {
  const actualTheme = useActualTheme();
  const isDark = actualTheme === 'dark';
  const bgImage = isDark ? '/loginhei.svg' : '/loginbai.svg';

  return (
    <div
      className='relative overflow-hidden flex flex-col items-center justify-center min-h-[calc(100vh-60px)] py-12 px-4 sm:px-6 lg:px-8'
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className='w-full max-w-sm mt-[60px] flex-1 flex flex-col items-center justify-center'>
        {children}
      </div>

      <div className='w-full text-center py-6 mt-auto'>
        <p className='text-xs text-gray-500 dark:text-gray-400'>
          &copy; 2025 知来API. All rights reserved.
        </p>
        <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
          我们尊重客户隐私，不保留聊天记录。国内用户请遵守生成式人工智能服务管理暂行办法。
        </p>
      </div>
    </div>
  );
};

export default AuthLayout;
