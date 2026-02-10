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
          <div className={`w-full min-h-[600px] relative overflow-hidden ${isDark ? 'bg-black' : 'bg-white'}`}>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
                {/* Left Column: Text */}
                <div className='text-left' style={{ animation: 'fadeInUp 0.6s ease both' }}>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6 ${isDark ? 'border-gray-800 bg-gray-900/50 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                    <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-white' : 'bg-black'}`}></span>
                    <span className='text-xs font-medium'>{t('稳定 · 高效 · 易用')}</span>
                  </div>

                  <h1 className={`text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'} ${isChinese ? 'tracking-wide' : ''}`}>
                    {t('统一的')}
                    <br />
                    <span className='shine-text'>{t('大模型接口网关')}</span>
                  </h1>

                  <p className={`text-lg md:text-xl mb-8 leading-relaxed max-w-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t('更好的价格，更好的稳定性。只需要将模型基址替换，即可无缝接入全球主流 AI 模型。')}
                  </p>

                  <div className='flex flex-col sm:flex-row gap-4 mb-10'>
                    <div className='flex-1 max-w-md'>
                      <Input
                        readonly
                        value={serverAddress}
                        className={`!rounded-full h-12 text-base ${isDark ? '!bg-gray-900 !border-gray-800' : ''}`}
                        suffix={
                          <div className='flex items-center gap-2 mr-1'>
                            <Button
                              type='primary'
                              theme='solid'
                              onClick={handleCopyBaseURL}
                              icon={<IconCopy />}
                              className='!rounded-full !h-8 !px-3 !bg-black hover:!bg-gray-800 dark:!bg-white dark:!text-black dark:hover:!bg-gray-200'
                            >
                              {t('复制')}
                            </Button>
                          </div>
                        }
                      />
                    </div>
                  </div>

                  <div className='flex flex-wrap gap-4'>
                    <Link to='/console'>
                      <Button
                        theme='solid'
                        type='primary'
                        size='large'
                        className='!rounded-full px-8 h-12 text-base font-semibold shadow-lg !bg-black hover:!bg-gray-800 dark:!bg-white dark:!text-black dark:hover:!bg-gray-200'
                        icon={<IconPlay />}
                      >
                        {t('立即开始')}
                      </Button>
                    </Link>
                    {isDemoSiteMode && statusState?.status?.version ? (
                      <Button
                        size='large'
                        className={`!rounded-full px-8 h-12 text-base font-semibold border ${isDark ? '!bg-transparent !text-white !border-gray-700 hover:!bg-gray-800' : '!bg-white !text-gray-900 !border-gray-200 hover:!bg-gray-50'}`}
                        icon={<IconGithubLogo />}
                        onClick={() => window.open('https://github.com/QuantumNous/new-api', '_blank')}
                      >
                        GitHub
                      </Button>
                    ) : (
                      docsLink && (
                        <Button
                          size='large'
                          className={`!rounded-full px-8 h-12 text-base font-semibold border ${isDark ? '!bg-transparent !text-white !border-gray-700 hover:!bg-gray-800' : '!bg-white !text-gray-900 !border-gray-200 hover:!bg-gray-50'}`}
                          icon={<IconFile />}
                          onClick={() => window.open(docsLink, '_blank')}
                        >
                          {t('文档')}
                        </Button>
                      )
                    )}
                  </div>
                </div>

                {/* Right Column: Image */}
                <div className='relative lg:h-[600px] flex items-center justify-center' style={{ animation: 'fadeInUp 0.8s ease both 0.2s' }}>
                  <div className='relative w-full max-w-lg aspect-square'>
                    {/* Background Glow */}
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] blur-[100px] rounded-full pointing-events-none ${isDark ? 'bg-white/5' : 'bg-black/5'}`}></div>
                    <img
                      src={isDark ? '/loginhei.svg' : '/loginbai.svg'}
                      alt="Hero Visual"
                      className='relative z-10 w-full h-full object-contain drop-shadow-2xl animate-[floatPulse_6s_ease-in-out_infinite]'
                    />
                  </div>
                </div>
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
                  { icon: '🔒', title: t('安全稳定'), desc: t('企业级安全防护，数据加密传输，99.9% 可用性保障，让您的业务无忧运行。') },
                  { icon: '⚡', title: t('极速响应'), desc: t('全球多节点部署，智能路由选择，毫秒级响应延迟，确保最佳使用体验。') },
                  { icon: '💰', title: t('价格优惠'), desc: t('按量计费，无最低消费，价格远低于官方直连，为您节省大量成本。') },
                  { icon: '🔄', title: t('统一接口'), desc: t('一个接口对接 40+ 大模型供应商，无需分别适配，大幅降低开发成本。') },
                  { icon: '📊', title: t('智能负载'), desc: t('智能负载均衡与故障转移，自动切换最优通道，保障服务连续性。') },
                  { icon: '🛠', title: t('灵活计费'), desc: t('支持按量、按次、包月等多种计费方式，满足不同场景的使用需求。') },
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    className={`group p-8 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${isDark ? 'bg-[#0a0a0a] border-gray-800 hover:border-gray-700' : 'bg-white border-gray-100 hover:border-gray-300'}`}
                  >
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl mb-6 transition-transform group-hover:scale-110 ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
                      {feature.icon}
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
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${isDark ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>OpenAI</span>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${isDark ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>Claude</span>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${isDark ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>Gemini</span>
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium border ${isDark ? 'bg-gray-900 border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>Midjourney</span>
                </div>
              </div>

              <div className='grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-x-4 gap-y-8'>
                {[
                  <Moonshot key='moonshot' size={40} />,
                  <OpenAI key='openai' size={40} />,
                  <XAI key='xai' size={40} />,
                  <Zhipu.Color key='zhipu' size={40} />,
                  <Volcengine.Color key='volcengine' size={40} />,
                  <Cohere.Color key='cohere' size={40} />,
                  <Claude.Color key='claude' size={40} />,
                  <Gemini.Color key='gemini' size={40} />,
                  <Suno key='suno' size={40} />,
                  <Minimax.Color key='minimax' size={40} />,
                  <Wenxin.Color key='wenxin' size={40} />,
                  <Spark.Color key='spark' size={40} />,
                  <Qingyan.Color key='qingyan' size={40} />,
                  <DeepSeek.Color key='deepseek' size={40} />,
                  <Qwen.Color key='qwen' size={40} />,
                  <Midjourney key='midjourney' size={40} />,
                  <Grok key='grok' size={40} />,
                  <AzureAI.Color key='azureai' size={40} />,
                  <Hunyuan.Color key='hunyuan' size={40} />,
                  <Xinference.Color key='xinference' size={40} />,
                ].map((icon, idx) => (
                  <div key={idx} className={`flex items-center justify-center p-4 rounded-xl border transition-all duration-300 hover:scale-105 ${isDark ? 'bg-[#0a0a0a] border-gray-800 hover:border-gray-600' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
                    {icon}
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
