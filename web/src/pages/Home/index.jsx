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

import React, { useContext, useEffect, useState } from 'react';
import {
  Button,
  Typography,
  Input,
  ScrollList,
  ScrollItem,
} from '@douyinfe/semi-ui';
import { API, showError, copy, showSuccess } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { API_ENDPOINTS } from '../../constants/common.constant';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import {
  IconGithubLogo,
  IconPlay,
  IconFile,
  IconCopy,
} from '@douyinfe/semi-icons';
import { Link } from 'react-router-dom';
import NoticeModal from '../../components/layout/NoticeModal';
import FooterBar from '../../components/layout/Footer';
import {
  Moonshot,
  OpenAI,
  XAI,
  Zhipu,
  Volcengine,
  Cohere,
  Claude,
  Gemini,
  Suno,
  Minimax,
  Wenxin,
  Spark,
  Qingyan,
  DeepSeek,
  Qwen,
  Midjourney,
  Grok,
  AzureAI,
  Hunyuan,
  Xinference,
} from '@lobehub/icons';

const { Text } = Typography;

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const isDark = actualTheme === 'dark';
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
  const isDemoSiteMode = statusState?.status?.demo_site_enabled || false;
  const docsLink = statusState?.status?.docs_link || '';
  const serverAddress =
    statusState?.status?.server_address || `${window.location.origin}`;
  const endpointItems = API_ENDPOINTS.map((e) => ({ value: e }));
  const [endpointIndex, setEndpointIndex] = useState(0);
  const isChinese = i18n.language.startsWith('zh');

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      let content = data;
      if (!data.startsWith('https://')) {
        content = marked.parse(data);
      }
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      // 如果内容是 URL，则发送主题模式
      if (data.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent('加载首页内容失败...');
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(serverAddress);
    if (ok) {
      showSuccess(t('已复制到剪切板'));
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('获取公告失败:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setEndpointIndex((prev) => (prev + 1) % endpointItems.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [endpointItems.length]);

  return (
    <div className={`w-full overflow-x-hidden ${isDark ? 'bg-black' : 'bg-white'}`}>
      <style>{`
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes shine {
            0% { background-position: -100% 0; }
            100% { background-position: 100% 0; }
        }
        @keyframes floatPulse {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
        }
        .shine-text {
            background: linear-gradient(90deg, #000000 0%, #333333 40%, #666666 50%, #333333 60%, #000000 100%);
            background-size: 200% 100%;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shine 3.2s ease-in-out infinite 1s;
        }
        .dark .shine-text {
             background: linear-gradient(90deg, #ffffff 0%, #cccccc 40%, #999999 50%, #cccccc 60%, #ffffff 100%);
             background-size: 200% 100%;
             -webkit-background-clip: text;
             background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        `}</style>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='w-full overflow-x-hidden'>
          {/* Hero Section */}
          <div
            className={`w-full relative overflow-hidden flex flex-col items-center justify-center text-center pt-32 pb-20 ${isDark ? 'bg-black' : 'bg-white'}`}
            style={{
              backgroundImage: `url(${isDark ? '/loginhei.svg' : '/loginbai.svg'})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className='max-w-4xl mx-auto px-4 relative z-10'>
              <h1 className={`text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'} tracking-wide`}>
                {t('聚灵API · 专业大模型中转平台')}
              </h1>

              <p className={`text-lg md:text-xl leading-relaxed max-w-3xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {t('面向企业与创作者的轻量网关方案。更快的响应，更稳的通道，更低的成本，一次接入，使用 300+ 模型与生态能力。')}
              </p>
            </div>
          </div>

          {/* Quick Start Section */}
          <div className={`py-16 ${isDark ? 'bg-black' : 'bg-white'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='text-center mb-12'>
                <h2 className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('快速开始')}
                </h2>
                <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('与主流 AIGC 应用深度打通，开箱即用，持续适配更多生态。')}
                </p>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6'>
                {[
                  {
                    title: t('全能AI'),
                    desc: t('一站式AI对话、AI绘画、AI音乐、AI视频、文档分析、联网搜索等功能。'),
                    icon: '🤖',
                    color: 'from-purple-500 to-indigo-500',
                    bg: isDark ? 'bg-indigo-950/30' : 'bg-indigo-50',
                    border: isDark ? 'border-indigo-800' : 'border-indigo-100'
                  },
                  {
                    title: 'OpenWebUI',
                    desc: t('本地/私有化部署界面，统一管理和调用不同模型与对话。'),
                    icon: '🌐',
                    color: 'from-blue-400 to-cyan-400',
                    bg: isDark ? 'bg-blue-950/30' : 'bg-blue-50',
                    border: isDark ? 'border-blue-800' : 'border-blue-100'
                  },
                  {
                    title: 'LobeChat',
                    desc: t('企业级 RAG 检索增强，支持 PDF/网页/数据库多源接入。'),
                    icon: '💬',
                    color: 'from-orange-400 to-amber-400',
                    bg: isDark ? 'bg-orange-950/30' : 'bg-orange-50',
                    border: isDark ? 'border-orange-800' : 'border-orange-100'
                  },
                  {
                    title: t('GPT画图'),
                    desc: t('轻量级部署，聚合gpt-4o、Sora-image、gpt-image-1。'),
                    icon: '🎨',
                    color: 'from-yellow-400 to-orange-400',
                    bg: isDark ? 'bg-yellow-950/30' : 'bg-yellow-50',
                    border: isDark ? 'border-yellow-800' : 'border-yellow-100'
                  },
                  {
                    title: 'NextChat',
                    desc: t('基于 ChatGPT-Next-Web 框架开发，轻量级部署。'),
                    icon: '🚀',
                    color: 'from-emerald-400 to-green-400',
                    bg: isDark ? 'bg-emerald-950/30' : 'bg-emerald-50',
                    border: isDark ? 'border-emerald-800' : 'border-emerald-100'
                  }
                ].map((item, idx) => (
                  <div key={idx} className={`rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${item.bg} ${item.border}`}>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl mb-4 bg-white/10`}>
                      {item.icon}
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{item.title}</h3>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className={`py-16 ${isDark ? 'bg-black' : 'bg-white'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
                {[
                  {
                    title: t('企业级稳定'),
                    desc: t('多通道智能调度与容灾策略，自动重试与限流保护，保障关键业务稳定运行。'),
                    icon: '🛡️',
                    bg: isDark ? 'bg-[#1e293b]' : 'bg-white',
                  },
                  {
                    title: t('零改造接入'),
                    desc: t('完全兼容主流协议与 SDK，一套 Key 即可访问主流厂商与热门模型。'),
                    icon: '⚡',
                    bg: isDark ? 'bg-[#1e293b]' : 'bg-white',
                  },
                  {
                    title: t('按量计费更省'),
                    desc: t('灵会计费与多档套餐，源头直供价格，更低成本释放更强模型能力。'),
                    icon: '💳',
                    bg: isDark ? 'bg-[#1e293b]' : 'bg-white',
                  }
                ].map((item, idx) => (
                  <div key={idx} className={`p-8 rounded-2xl border shadow-sm flex flex-col items-start hover:-translate-y-1 transition-transform duration-300 ${item.bg} ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
                    <div className='w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-2xl mb-6 text-blue-500'>
                      {item.icon}
                    </div>
                    <h3 className={`text-xl font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </h3>
                    <p className={`text-base leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className={`py-12 border-y ${isDark ? 'bg-black border-gray-900' : 'bg-white border-gray-100'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-8'>
                {[
                  { num: '40+', label: t('支持模型供应商') },
                  { num: '99.9%', label: t('服务可用性') },
                  { num: '<100ms', label: t('平均响应延迟') },
                  { num: '24/7', label: t('技术支持') },
                ].map((stat, idx) => (
                  <div key={idx} className='text-center'>
                    <div className={`text-4xl md:text-5xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
                      {stat.num}
                    </div>
                    <div className={`text-sm font-medium ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Supported Models Section */}
          <div className={`py-24 ${isDark ? 'bg-black' : 'bg-white'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='text-center mb-16'>
                <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('支持众多的大模型供应商')}
                </h2>
                <div className='flex flex-wrap justify-center gap-3'>
                  {/* Chips removed as requested */}
                </div>
              </div>

              <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-4 gap-y-10'>
                {[
                  { component: <OpenAI key='openai' size={32} />, name: 'OpenAI' },
                  { component: <Claude.Color key='claude' size={32} />, name: 'Claude' },
                  { component: <Gemini.Color key='gemini' size={32} />, name: 'Gemini' },
                  { component: <Midjourney key='midjourney' size={32} />, name: 'Midjourney' },
                  { component: <Moonshot key='moonshot' size={32} />, name: 'Moonshot' },
                  { component: <XAI key='xai' size={32} />, name: 'xAI' },
                  { component: <Zhipu.Color key='zhipu' size={32} />, name: 'Zhipu' },
                  { component: <Volcengine.Color key='volcengine' size={32} />, name: 'Volcengine' },
                  { component: <Cohere.Color key='cohere' size={32} />, name: 'Cohere' },
                  { component: <Suno key='suno' size={32} />, name: 'Suno' },
                  { component: <Minimax.Color key='minimax' size={32} />, name: 'Minimax' },
                  { component: <Wenxin.Color key='wenxin' size={32} />, name: 'Wenxin' },
                  { component: <Spark.Color key='spark' size={32} />, name: 'Spark' },
                  { component: <Qingyan.Color key='qingyan' size={32} />, name: 'Qingyan' },
                  { component: <DeepSeek.Color key='deepseek' size={32} />, name: 'DeepSeek' },
                  { component: <Qwen.Color key='qwen' size={32} />, name: 'Qwen' },
                  { component: <Grok key='grok' size={32} />, name: 'Grok' },
                  { component: <AzureAI.Color key='azureai' size={32} />, name: 'Azure AI' },
                  { component: <Hunyuan.Color key='hunyuan' size={32} />, name: 'Hunyuan' },
                  { component: <Xinference.Color key='xinference' size={32} />, name: 'Xinference' },
                ].map((item, idx) => (
                  <div key={idx} className={`flex flex-col items-center justify-center gap-3 p-4 rounded-xl border transition-all duration-300 hover:scale-105 hover:shadow-lg ${isDark ? 'bg-[#0a0a0a] border-gray-800 hover:border-gray-600' : 'bg-white border-gray-100'}`}>
                    <div className='flex items-center justify-center'>
                      {item.component}
                    </div>
                    <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className={`py-20 ${isDark ? 'bg-black' : 'bg-white'}`}>
            <div className='max-w-4xl mx-auto px-4 text-center'>
              <h3 className={`text-lg font-semibold mb-8 tracking-wider uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('支持多种支付方式')}
              </h3>
              <div className='flex flex-wrap items-center justify-center gap-8 opacity-80 hover:opacity-100 transition-opacity'>
                {['visa', 'mastercard', 'pay-alipay', 'WechatPay_', 'paypal', 'Bitcoin', 'USDT', 'union_pay'].map((name) => (
                  <img
                    key={name}
                    src={`/payment/${name}.svg`}
                    alt={name}
                    className='h-12 md:h-14 object-contain grayscale hover:grayscale-0 transition-all duration-300'
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <FooterBar />
        </div>

      ) : (
        <div className='overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className='w-full h-screen border-none'
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
