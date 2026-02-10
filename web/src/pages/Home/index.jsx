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

import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  Button,
} from '@douyinfe/semi-ui';
import { API, showError } from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { StatusContext } from '../../context/Status';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import {
  IconShield,
  IconBolt,
  IconCoinMoneyStroked,
  IconLink,
  IconBarChartVStroked,
  IconSettingStroked,
  IconPlay,
  IconKey,
  IconCode,
  IconRefresh,
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

// Custom hook for count-up animation
const useCountUp = (end, duration = 2000, suffix = '') => {
  const [count, setCount] = useState('0');
  const ref = useRef(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const numericEnd = parseFloat(end.replace(/[^0-9.]/g, ''));
    const prefix = end.startsWith('<') ? '<' : '';
    const startTime = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * numericEnd;
      if (end.includes('.')) {
        setCount(prefix + current.toFixed(1) + suffix);
      } else {
        setCount(prefix + Math.floor(current) + suffix);
      }
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [started, end, duration, suffix]);

  return { count, ref };
};

const Home = () => {
  const { t, i18n } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const actualTheme = useActualTheme();
  const isDark = actualTheme === 'dark';
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const isMobile = useIsMobile();
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

  // Stats with count-up
  const stat1 = useCountUp('40', 2000, '+');
  const stat2 = useCountUp('99.9', 2000, '%');
  const stat3 = useCountUp('70', 2000, 'ms');
  const stat4 = useCountUp('7', 1500, '/24');

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
        <div className='w-full overflow-x-hidden relative'>
          {/* SVG Background - covers entire page */}
          <img
            src={isDark ? '/loginhei.svg' : '/loginbai.svg'}
            alt=''
            className='absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none select-none z-0'
          />
          {/* Hero Section */}
          <div className={`w-full min-h-[600px] relative overflow-hidden ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
            <div className='relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-28 md:py-40 text-center'>
              <div style={{ animation: 'fadeInUp 0.6s ease both' }}>
                <h1 className={`text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <span className='shine-text'>{t('聚灵API')}</span>
                  <span className={`mx-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>
                  <span>{t('专业大模型中转平台')}</span>
                </h1>
                <p className={`text-lg md:text-xl mb-10 leading-relaxed max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('面向企业与创作者的轻量网关方案。更快的响应，更稳的通道，更低的成本，一次接入，使用 300+ 模型与生态能力。')}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Start Section */}
          <div className={`relative z-10 py-24 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='text-center mb-16'>
                <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('快速开始')}
                </h2>
                <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('只需三步，即可接入全球主流 AI 模型')}
                </p>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-8 mb-16'>
                {[
                  {
                    step: '01',
                    icon: <IconKey size='extra-large' />,
                    title: t('获取 API Key'),
                    desc: t('注册并登录后，在控制台创建你的专属 API Key'),
                  },
                  {
                    step: '02',
                    icon: <IconRefresh size='extra-large' />,
                    title: t('替换 Base URL'),
                    desc: t('将官方接口地址替换为我们的中转地址'),
                  },
                  {
                    step: '03',
                    icon: <IconCode size='extra-large' />,
                    title: t('开始使用'),
                    desc: t('使用任意兼容 OpenAI 的客户端或代码即可调用'),
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`relative p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isDark ? 'bg-black border-gray-800 hover:border-gray-700' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className={`absolute top-4 right-4 text-5xl font-extrabold ${isDark ? 'text-gray-800' : 'text-gray-100'}`}>
                      {item.step}
                    </div>
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-5 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {item.icon}
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {item.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ecosystem Section */}
          <div className={`relative z-10 py-24 ${isDark ? 'bg-black' : 'bg-white'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='text-center mb-16'>
                <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('快速开始')}
                </h2>
                <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('与主流 AIGC 应用深度打通，开箱即用，持续适配更多生态。')}
                </p>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6'>
                {[
                  {
                    name: t('全能 AI'),
                    desc: t('一站式 AI 对话、AI 绘画、AI 音乐、AI 视频、文档分析、联网检索等功能。'),
                  },
                  {
                    name: 'OpenWebUI',
                    desc: t('本地/私有化部署界面，统一管理与调用不同模型与会话。'),
                  },
                  {
                    name: 'LobeChat',
                    desc: t('企业级 RAG 检索增强，支持 PDF/网页/数据库多源接入。'),
                  },
                  {
                    name: t('GPT 画图'),
                    desc: t('轻量级部署，聚合 gpt-4o、Sora-image、gpt-image-1。'),
                  },
                  {
                    name: 'NextChat',
                    desc: t('基于 ChatGPT-Next-Web 框架开发，轻量级部署。'),
                  },
                ].map((app, idx) => (
                  <div
                    key={idx}
                    className={`group p-6 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isDark ? 'bg-[#0a0a0a] border-gray-800 hover:border-gray-700' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
                  >
                    <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {app.name}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {app.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className={`py-24 ${isDark ? 'bg-black' : 'bg-white'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='text-center mb-16'>
                <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('为什么选择我们')}
                </h2>
                <p className={`text-lg max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('企业级 API 中转服务，稳定可靠，为您的业务保驾护航')}
                </p>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
                {[
                  { icon: '/zhuye/安全稳定.svg', title: t('安全稳定'), desc: t('企业级安全防护，数据加密传输，99.9% 可用性保障，让您的业务无忧运行。') },
                  { icon: '/zhuye/极速响应.svg', title: t('极速响应'), desc: t('全球多节点部署，智能路由选择，毫秒级响应延迟，确保最佳使用体验。') },
                  { icon: '/zhuye/价格优惠.svg', title: t('价格优惠'), desc: t('按量计费，无最低消费，价格远低于官方直连，为您节省大量成本。') },
                  { icon: '/zhuye/统一接口.svg', title: t('统一接口'), desc: t('一个接口对接 40+ 大模型供应商，无需分别适配，大幅降低开发成本。') },
                  { icon: '/zhuye/智能负载.svg', title: t('智能负载'), desc: t('智能负载均衡与故障转移，自动切换最优通道，保障服务连续性。') },
                  { icon: '/zhuye/灵活计费.svg', title: t('灵活计费'), desc: t('支持按量、按次、包月等多种计费方式，满足不同场景的使用需求。') },
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    className={`group p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isDark ? 'bg-[#0a0a0a] border-gray-800 hover:border-gray-700' : 'bg-white border-gray-100 hover:border-gray-300'}`}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                      <img src={feature.icon} alt={feature.title} className='w-8 h-8 object-contain' />
                    </div>
                    <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {feature.title}
                    </h3>
                    <p className={`leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {feature.desc}
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
                <div ref={stat1.ref} className='text-center'>
                  <div className={`text-4xl md:text-5xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
                    {stat1.count}
                  </div>
                  <div className='text-sm font-medium text-gray-500'>{t('支持模型供应商')}</div>
                </div>
                <div ref={stat2.ref} className='text-center'>
                  <div className={`text-4xl md:text-5xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
                    {stat2.count}
                  </div>
                  <div className='text-sm font-medium text-gray-500'>{t('服务可用性')}</div>
                </div>
                <div ref={stat3.ref} className='text-center'>
                  <div className={`text-4xl md:text-5xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
                    {'<'}{stat3.count}
                  </div>
                  <div className='text-sm font-medium text-gray-500'>{t('平均响应延迟')}</div>
                </div>
                <div ref={stat4.ref} className='text-center'>
                  <div className={`text-4xl md:text-5xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-black'}`}>
                    {stat4.count}
                  </div>
                  <div className='text-sm font-medium text-gray-500'>{t('技术支持')}</div>
                </div>
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
              </div>

              <div className='grid grid-cols-4 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-10 gap-x-4 gap-y-8'>
                {[
                  { icon: <Moonshot size={40} />, name: 'Moonshot' },
                  { icon: <OpenAI size={40} />, name: 'OpenAI' },
                  { icon: <XAI size={40} />, name: 'xAI' },
                  { icon: <Zhipu.Color size={40} />, name: 'Zhipu' },
                  { icon: <Volcengine.Color size={40} />, name: 'Volcengine' },
                  { icon: <Cohere.Color size={40} />, name: 'Cohere' },
                  { icon: <Claude.Color size={40} />, name: 'Claude' },
                  { icon: <Gemini.Color size={40} />, name: 'Gemini' },
                  { icon: <Suno size={40} />, name: 'Suno' },
                  { icon: <Minimax.Color size={40} />, name: 'Minimax' },
                  { icon: <Wenxin.Color size={40} />, name: 'Wenxin' },
                  { icon: <Spark.Color size={40} />, name: 'Spark' },
                  { icon: <Qingyan.Color size={40} />, name: 'Qingyan' },
                  { icon: <DeepSeek.Color size={40} />, name: 'DeepSeek' },
                  { icon: <Qwen.Color size={40} />, name: 'Qwen' },
                  { icon: <Midjourney size={40} />, name: 'Midjourney' },
                  { icon: <Grok size={40} />, name: 'Grok' },
                  { icon: <AzureAI.Color size={40} />, name: 'Azure AI' },
                  { icon: <Hunyuan.Color size={40} />, name: 'Hunyuan' },
                  { icon: <Xinference.Color size={40} />, name: 'Xinference' },
                ].map((item, idx) => (
                  <div key={idx} className='flex flex-col items-center gap-2'>
                    <div className={`flex items-center justify-center p-4 rounded-xl border transition-all duration-300 hover:scale-105 bg-white ${isDark ? 'border-gray-700 hover:border-gray-500' : 'border-gray-100 hover:shadow-lg'}`}>
                      {item.icon}
                    </div>
                    <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* API Formats Section */}
          <div className={`relative z-10 py-24 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='text-center mb-16'>
                <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('我们支持的 API 格式')}
                </h2>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5'>
                {[
                  {
                    title: t('OpenAI 对话接口'),
                    desc: t('OpenAI 聊天对话接口，支持多轮对话'),
                    endpoint: '/v1/chat/completions',
                  },
                  {
                    title: t('OpenAI 响应式接口'),
                    desc: t('OpenAI 响应式接口，支持实时流式响应处理'),
                    endpoint: '/v1/responses',
                  },
                  {
                    title: t('Claude 格式'),
                    desc: t('Anthropic Claude 模型调用，支持多轮对话和高级推理'),
                    endpoint: '/v1/messages',
                  },
                  {
                    title: t('Gemini 格式'),
                    desc: t('Google Gemini 模型调用，支持多模态内容处理'),
                    endpoint: '/v1beta/models/',
                  },
                  {
                    title: t('生图接口'),
                    desc: t('DALL-E 图像生成，支持文本到图像的转换'),
                    endpoint: '/v1/images/generations',
                  },
                  {
                    title: t('编辑图片'),
                    desc: t('图像编辑和处理，支持图片修改和优化'),
                    endpoint: '/v1/images/edits',
                  },
                  {
                    title: t('视频接口'),
                    desc: t('视频处理和生成，支持视频创建和编辑'),
                    endpoint: '/v1/videos',
                  },
                  {
                    title: t('文本嵌入'),
                    desc: t('文本向量化处理，支持语义搜索和相似度计算'),
                    endpoint: '/v1/embeddings',
                  },
                  {
                    title: t('Suno 音乐'),
                    desc: t('Suno AI 音乐生成，支持文本到音乐的创作'),
                    endpoint: '/suno/submit/music',
                  },
                  {
                    title: t('Midjourney 绘图'),
                    desc: t('Midjourney AI 绘图，支持高质量图像生成'),
                    endpoint: '/mj/submit/imagine',
                  },
                  {
                    title: t('支持更多 API'),
                    desc: t('支持更多 API 接口和高级功能'),
                    endpoint: '/v1/custom/*',
                  },
                ].map((api, idx) => (
                  <div
                    key={idx}
                    className={`group p-5 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${isDark ? 'bg-black border-gray-800 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'}`}
                  >
                    <h4 className={`text-sm font-bold mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {api.title}
                    </h4>
                    <p className={`text-xs leading-relaxed mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                      {api.desc}
                    </p>
                    <code className={`text-xs px-2.5 py-1 rounded-md font-mono ${isDark ? 'bg-gray-900 text-blue-400' : 'bg-gray-100 text-blue-600'}`}>
                      {api.endpoint}
                    </code>
                  </div>
                ))}
              </div>

              {/* Bottom note */}
              <div className={`mt-12 text-center max-w-2xl mx-auto p-8 rounded-2xl border border-dashed ${isDark ? 'border-gray-800' : 'border-gray-300'}`}>
                <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {t('还有更多接口和功能')}
                </h3>
                <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('除了上述接口外，我们的平台还支持更多高级功能和定制化接口。无论您需要什么样的 AI 能力，我们都能为您提供完整的解决方案。')}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className={`py-20 ${isDark ? 'bg-black' : 'bg-white'}`}>
            <div className='max-w-7xl mx-auto px-4 text-center'>
              <h3 className={`text-lg font-semibold mb-8 tracking-wider uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {t('支持多种支付方式')}
              </h3>
              <div className='flex items-center justify-center gap-6 lg:gap-10 flex-nowrap overflow-x-auto'>
                {['visa', 'mastercard', 'pay-alipay', 'WechatPay_', 'paypal', 'Bitcoin', 'USDT', 'union_pay'].map((name) => (
                  <img
                    key={name}
                    src={`/payment/${name}.svg`}
                    alt={name}
                    className='h-16 md:h-20 flex-shrink-0 object-contain transition-all duration-300 hover:scale-110'
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
