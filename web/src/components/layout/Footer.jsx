/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getFooterHTML } from '../../helpers';
import { useActualTheme } from '../../context/Theme';
import { IconChevronRight } from '@douyinfe/semi-icons';

const FooterBar = () => {
  const { t } = useTranslation();
  const [footer, setFooter] = useState(getFooterHTML());
  const actualTheme = useActualTheme();
  const isDark = actualTheme === 'dark';

  const loadFooter = () => {
    let footer_html = localStorage.getItem('footer_html');
    if (footer_html) {
      setFooter(footer_html);
    }
  };

  const currentYear = new Date().getFullYear();

  const customFooter = useMemo(
    () => (
      <footer
        className={`border-t ${isDark ? 'bg-black border-gray-900' : 'bg-white border-gray-100'}`}
      >
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20'>
          {/* Main grid */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-12'>
            {/* About section */}
            <div className='lg:col-span-4 space-y-6'>
              <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('关于我们')}
              </h3>
              <p className={`leading-relaxed text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('知来API 专注于为开发者提供稳定高速的一站式大语言模型 API 中转服务，支持 OpenAI GPT、Anthropic Claude、Midjourney、Google Gemini 等主流 LLM，统一鉴权、灵活计费、智能负载均衡，助你低成本接入多模型 AI 能力。')}
              </p>
            </div>

            {/* Quick links */}
            <div className='lg:col-span-3'>
              <h3 className={`text-lg font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {t('快速链接')}
              </h3>
              <ul className='space-y-3'>
                {[
                  { href: '/console', label: t('控制台') },
                  { href: '/pricing', label: t('模型价格') },
                  { href: '/about', label: t('关于') },
                ].map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className={`flex items-center gap-2 text-sm transition-colors ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'}`}
                    >
                      <IconChevronRight size='small' />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* QR codes */}
            <div className='lg:col-span-5 grid grid-cols-2 gap-8'>
              <div className='flex flex-col items-center justify-center'>
                <div className='text-center'>
                  <div className={`p-4 rounded-lg shadow-xl inline-block transition-all hover:scale-105 ${isDark ? 'bg-gray-900' : 'bg-white shadow-lg'}`}>
                    <img
                      src='https://image.177911.com/image/qrcode_for_gh_3674cdc88ed6_258.jpg'
                      alt={t('企业微信')}
                      className='w-32 h-32 object-cover rounded-lg'
                    />
                  </div>
                  <p className={`mt-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('企业微信')}
                  </p>
                </div>
              </div>
              <div className='flex flex-col items-center justify-center'>
                <div className='text-center'>
                  <div className={`p-4 rounded-lg shadow-xl inline-block transition-all hover:scale-105 ${isDark ? 'bg-gray-900' : 'bg-white shadow-lg'}`}>
                    <img
                      src='https://image.177911.com/image/personal-wechat.jpg'
                      alt={t('微信客服')}
                      className='w-32 h-32 object-cover rounded-lg'
                    />
                  </div>
                  <p className={`mt-4 font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {t('微信客服')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className={`border-t pt-8 ${isDark ? 'border-gray-800' : 'border-gray-100'}`}>
            <div className='text-center'>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                &copy; {currentYear} {t('知来API')}. All rights reserved.
              </p>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                {t('我们尊重客户隐私，不保留聊天记录。国内用户请遵守生成式人工智能服务管理暂行办法。')}
              </p>
            </div>
          </div>
        </div>
      </footer>
    ),
    [t, currentYear, isDark],
  );

  useEffect(() => {
    loadFooter();
  }, []);

  return (
    <div className='w-full'>
      {footer ? (
        <div className='relative'>
          <div
            className='custom-footer'
            dangerouslySetInnerHTML={{ __html: footer }}
          ></div>
          <div className='absolute bottom-2 right-4 text-xs !text-semi-color-text-2 opacity-70'>
            <span>{t('设计与开发由')} </span>
            <a
              href='https://github.com/QuantumNous/new-api'
              target='_blank'
              rel='noopener noreferrer'
              className='!text-semi-color-primary font-medium'
            >
              聚灵API
            </a>
          </div>
        </div>
      ) : (
        customFooter
      )}
    </div>
  );
};

export default FooterBar;
