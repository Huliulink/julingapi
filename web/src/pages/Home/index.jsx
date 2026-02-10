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
    <div className='w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='w-full overflow-x-hidden'>
          {/* Hero Section */}
          <div className={`w-full min-h-[520px] md:min-h-[600px] relative overflow-hidden ${isDark ? 'bg-[#141618]' : 'bg-[#f7f8fb]'}`}>
            <div className='flex items-center justify-center h-full px-4 py-20 md:py-28 mt-10'>
              <div className='flex flex-col items-center justify-center text-center max-w-4xl mx-auto'>
                <h1
                  className={`text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'} ${isChinese ? 'tracking-wide' : ''}`}
                >
                  {t('统一的')}
                  <br />
                  <span className='shine-text'>{t('大模型接口网关')}</span>
                </h1>
                <p className={`text-base md:text-lg max-w-xl mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('更好的价格，更好的稳定性，只需要将模型基址替换为：')}
                </p>

                {/* Base URL input */}
                <div className='flex flex-col md:flex-row items-center justify-center gap-4 w-full mt-6 max-w-md'>
                  <Input
                    readonly
                    value={serverAddress}
                    className='flex-1 !rounded-full'
                    size={isMobile ? 'default' : 'large'}
                    suffix={
                      <div className='flex items-center gap-2'>
                        <ScrollList
                          bodyHeight={32}
                          style={{ border: 'unset', boxShadow: 'unset' }}
                        >
                          <ScrollItem
                            mode='wheel'
                            cycled={true}
                            list={endpointItems}
                            selectedIndex={endpointIndex}
                            onSelect={({ index }) => setEndpointIndex(index)}
                          />
                        </ScrollList>
                        <Button
                          type='primary'
                          onClick={handleCopyBaseURL}
                          icon={<IconCopy />}
                          className='!rounded-full'
                        />
                      </div>
                    }
                  />
                </div>

                {/* Action buttons */}
                <div className='flex flex-row gap-4 justify-center items-center mt-8'>
                  <Link to='/console'>
                    <Button
                      theme='solid'
                      type='primary'
                      size={isMobile ? 'default' : 'large'}
                      className='!rounded-3xl px-8 py-2'
                      icon={<IconPlay />}
                    >
                      {t('获取密钥')}
                    </Button>
                  </Link>
                  {isDemoSiteMode && statusState?.status?.version ? (
                    <Button
                      size={isMobile ? 'default' : 'large'}
                      className='flex items-center !rounded-3xl px-6 py-2'
                      icon={<IconGithubLogo />}
                      onClick={() =>
                        window.open(
                          'https://github.com/QuantumNous/new-api',
                          '_blank',
                        )
                      }
                    >
                      {statusState.status.version}
                    </Button>
                  ) : (
                    docsLink && (
                      <Button
                        size={isMobile ? 'default' : 'large'}
                        className='flex items-center !rounded-3xl px-6 py-2'
                        icon={<IconFile />}
                        onClick={() => window.open(docsLink, '_blank')}
                      >
                        {t('文档')}
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className={`py-16 md:py-20 ${isDark ? 'bg-[#1a1d21]' : 'bg-white'}`}>
            <div className='max-w-6xl mx-auto px-4'>
              <div className='text-center mb-12'>
                <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {t('为什么选择我们')}
                </h2>
                <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('企业级 API 中转服务，稳定可靠')}
                </p>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
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
                    className={`rounded-2xl border p-7 transition-all duration-200 hover:-translate-y-1 ${isDark ? 'bg-[#22262b] border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-blue-200 hover:shadow-lg'}`}
                  >
                    <div className='text-3xl mb-4'>{feature.icon}</div>
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <div className={`py-12 ${isDark ? 'bg-[#141618]' : 'bg-[#f7f8fb]'}`}>
            <div className='max-w-6xl mx-auto px-4'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                {[
                  { num: '40+', label: t('支持模型供应商') },
                  { num: '99.9%', label: t('服务可用性') },
                  { num: '<100ms', label: t('平均响应延迟') },
                  { num: '24/7', label: t('技术支持') },
                ].map((stat, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-5 text-center ${isDark ? 'bg-[#22262b] border-gray-700' : 'bg-white border-gray-200'}`}
                  >
                    <div className='text-3xl md:text-4xl font-extrabold text-blue-500 mb-2'>
                      {stat.num}
                    </div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Supported Models Section */}
          <div className={`py-16 md:py-20 ${isDark ? 'bg-[#1a1d21]' : 'bg-white'}`}>
            <div className='max-w-6xl mx-auto px-4'>
              <div className='text-center mb-12'>
                <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {t('支持众多的大模型供应商')}
                </h2>
                <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('一个接口，接入全球主流 AI 模型')}
                </p>
              </div>
              <div className='flex flex-wrap items-center justify-center gap-4 md:gap-6 lg:gap-8 max-w-5xl mx-auto'>
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
                  <div key={idx} className='w-10 h-10 md:w-12 md:h-12 flex items-center justify-center'>
                    {icon}
                  </div>
                ))}
                <div className='w-10 h-10 md:w-12 md:h-12 flex items-center justify-center'>
                  <Text className='!text-xl md:!text-2xl font-bold'>40+</Text>
                </div>
              </div>
            </div>
          </div>

          {/* API Formats Section */}
          <div className={`py-16 md:py-20 ${isDark ? 'bg-[#141618]' : 'bg-[#f7f8fb]'}`}>
            <div className='max-w-6xl mx-auto px-4'>
              <div className='text-center mb-12'>
                <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  {t('支持的 API 格式')}
                </h2>
                <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('支持多种 API 格式和功能，无缝对接您的应用')}
                </p>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {[
                  { title: 'OpenAI Chat', endpoint: '/v1/chat/completions', color: 'blue' },
                  { title: 'OpenAI Responses', endpoint: '/v1/responses', color: 'teal' },
                  { title: 'Claude Messages', endpoint: '/v1/messages', color: 'blue' },
                  { title: 'Gemini', endpoint: '/v1beta/models/', color: 'green' },
                  { title: t('图像生成'), endpoint: '/v1/images/generations', color: 'gray' },
                  { title: t('文本嵌入'), endpoint: '/v1/embeddings', color: 'gray' },
                ].map((api, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border overflow-hidden ${isDark ? 'bg-[#22262b] border-gray-700' : 'bg-white border-gray-200'}`}
                  >
                    <div className='bg-blue-600 px-5 py-3'>
                      <h4 className='text-base font-semibold text-white'>{api.title}</h4>
                    </div>
                    <div className='p-5'>
                      <code className={`text-sm font-mono px-3 py-1.5 rounded ${isDark ? 'bg-gray-800 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                        {api.endpoint}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className={`py-12 ${isDark ? 'bg-[#1a1d21]' : 'bg-white'}`}>
            <div className='max-w-4xl mx-auto px-4 text-center'>
              <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {t('支持多种支付方式')}
              </h3>
              <div className='flex flex-wrap items-center justify-center gap-4'>
                {['visa', 'mastercard', 'pay-alipay', 'WechatPay_', 'paypal', 'Bitcoin', 'USDT', 'union_pay'].map((name) => (
                  <img
                    key={name}
                    src={`/payment/${name}.svg`}
                    alt={name}
                    className='h-8 md:h-10 object-contain'
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
