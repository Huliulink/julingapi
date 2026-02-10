import React, { useEffect, useState } from 'react';
import { Card, Avatar, Button, Typography } from '@douyinfe/semi-ui';
import { IconArrowRight } from '@douyinfe/semi-icons';
import { API } from '../../helpers/api';
import { showError, showNotice, copy } from '../../helpers/utils';
import { useActualTheme } from '../../context/Theme';
import { marked } from 'marked';
import './Home.css'; // Import the extracted styles

const Home = () => {
  const [statusState, setStatusState] = useState({});
  const [homePageContent, setHomePageContent] = useState('');
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const theme = useActualTheme();
  const isDark = theme === 'dark';

  const displayStatus = async () => {
    try {
      const res = await API.get('/api/status');
      const { success, data } = res.data;
      if (success) {
        setStatusState(data);
      } else {
        showError('无法获取服务器状态');
      }
    } catch (error) {
      showError(error.message);
    }
  };

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    try {
      const res = await API.get('/api/home_page_content');
      const { success, data } = res.data;
      if (success) {
        setHomePageContent(data);
        localStorage.setItem('home_page_content', data);
      } else {
        showError('无法获取首页内容');
      }
      setHomePageContentLoaded(true);
    } catch (error) {
      showError(error.message);
      setHomePageContentLoaded(true);
    }
  };

  useEffect(() => {
    displayStatus();
    displayHomePageContent();
  }, []);

  const copyText = async (text) => {
    if (await copy(text)) {
      showNotice('已复制：' + text);
    } else {
      showNotice('无法复制到剪贴板，请手动复制');
    }
  };

  return (
    <div className={`home-container ${isDark ? 'dark-theme' : ''}`}>
      {homePageContentLoaded && homePageContent === '' ? (
        <>
          {/* Hero Section */}
          <section className="title-section container-custom" style={{ animation: 'fadeInUp .6s ease both' }}>
            <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: '40px', alignItems: 'center' }}>
              <div>
                <div className="hero-badge"><span className="badge-dot"></span> 聚灵API专业的大模型中转平台 · 新用户注册送 0.2 美元</div>
                <div className="chips" aria-label="特性标签" style={{ justifyContent: 'flex-start' }}>
                  <span className="chip">真源头</span>
                  <span className="chip">高稳定</span>
                  <span className="chip">低成本</span>
                  <span className="chip">轻松接入</span>
                </div>
                <h1 className="main-title" style={{ marginTop: '8px' }}>聚灵API · 专业大模型中转平台</h1>
                <p className="subtitle" style={{ margin: 0 }}>面向企业与创作者的轻量网关方案。更快的响应，更稳的通道，更低的成本，一次接入，使用 300+ 模型与生态能力。
                  <span className="price-inline"><span className="price-label">限时价</span><span className="price-accent">1元兑换1美刀额度</span><span className="price-chip">省87%</span></span>
                </p>
                <div className="button-group">
                  <a className="button-custom button-primary" href="/token">立即开始</a>
                  <a className="button-custom button-secondary" href="https://julingapi.apifox.cn/" target="_blank" rel="noreferrer">技术文档</a>
                  <a className="button-custom button-secondary" href="/pricing">模型定价</a>
                  <a className="button-custom button-secondary" href="/about">关于我们</a>
                </div>
              </div>
              <div>
                <div className="hero-visual">
                  <div className="visual-frame">
                    <div className="visual-inner">
                      <img className="visual-img" src="https://image.177911.com/image/电脑-01.png" alt="产品代表性形象" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Section */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">服务可用性</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">300+</div>
              <div className="stat-label">支持模型</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">15ms</div>
              <div className="stat-label">平均延迟</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">10k+</div>
              <div className="stat-label">用户</div>
            </div>
          </div>

          {/* Core Models Section */}
          <section className="apps">
            <div className="apps-grid">
              <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
                <div className="app-head">
                  <div className="app-icon"><img src="/zhuye/Chatgpt.svg" alt="ChatGPT" /></div>
                  <div className="app-name">ChatGPT</div>
                </div>
                <div className="app-desc">智能对话与写作辅助，支持多轮交互。</div>
              </a>
              <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
                <div className="app-head">
                  <div className="app-icon"><img src="/zhuye/Claude.svg" alt="Claude" /></div>
                  <div className="app-name">Claude</div>
                </div>
                <div className="app-desc">长文本分析与各种代码逻辑推理能力。</div>
              </a>
              <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
                <div className="app-head">
                  <div className="app-icon"><img src="/zhuye/Midjourney.svg" alt="Midjourney" /></div>
                  <div className="app-name">Midjourney</div>
                </div>
                <div className="app-desc">高质量AI绘画，生成艺术级图像作品。</div>
              </a>
              <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
                <div className="app-head">
                  <div className="app-icon"><img src="/zhuye/Sora_modle.svg" alt="Sora" /></div>
                  <div className="app-name">Sora</div>
                </div>
                <div className="app-desc">文本生成视频，创造逼真的动态场景。</div>
              </a>
              <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
                <div className="app-head">
                  <div className="app-icon"><img src="/zhuye/gemini-ai.svg" alt="Gemini" /></div>
                  <div className="app-name">Gemini</div>
                </div>
                <div className="app-desc">谷歌多模态大模型，处理文本图像视频。</div>
              </a>
            </div>
          </section>

          {/* Features Grid */}
          <section className="features-grid">
            <div className="feature-box">
              <div className="feature-head">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" /></svg>
                </div>
                <div className="feature-title">广泛模型支持</div>
              </div>
              <div className="feature-desc">一站式接入 OpenAI、Claude、Google Gemini 等主流大模型，支持 GPT-4o、Claude 3.5 等最新版本。</div>
            </div>
            <div className="feature-box">
              <div className="feature-head">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                </div>
                <div className="feature-title">极速响应体验</div>
              </div>
              <div className="feature-desc">全球多节点部署，智能路由优化，确保毫秒级响应速度，为您的应用提供流畅的交互体验。</div>
            </div>
            <div className="feature-box">
              <div className="feature-head">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                </div>
                <div className="feature-title">99.9% 高可用</div>
              </div>
              <div className="feature-desc">企业级架构设计，多级容灾备份，7x24小时实时监控，保障服务稳定运行，业务不中断。</div>
            </div>
            <div className="feature-box">
              <div className="feature-head">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                </div>
                <div className="feature-title">极具竞争力价格</div>
              </div>
              <div className="feature-desc">源头直连，去除中间环节，提供行业领先的价格优势。支持按量付费，不设最低消费门槛。</div>
            </div>
            <div className="feature-box">
              <div className="feature-head">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                </div>
                <div className="feature-title">隐私安全保护</div>
              </div>
              <div className="feature-desc">严格的数据加密传输与存储，遵守GDPR等隐私法规，承诺不存储用户对话数据，保障业务安全。</div>
            </div>
            <div className="feature-box">
              <div className="feature-head">
                <div className="feature-icon">
                  <svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                </div>
                <div className="feature-title">简单易用 API</div>
              </div>
              <div className="feature-desc">完全兼容 OpenAI 接口格式，无需修改代码即可无缝切换。提供详细开发文档与多语言 SDK。</div>
            </div>
          </section>

          {/* Advantages Section */}
          <section className="advantages">
            <h2 className="advantages-title">为什么选择聚灵API</h2>
            <p className="advantages-subtitle">为开发者打造的最佳基础设施</p>
            <div className="why-grid">
              <div className="why-list">
                <div className="why-item">
                  <div className="why-icon">
                    <svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  </div>
                  <div>
                    <div className="why-title">原生接口兼容</div>
                    <div className="why-desc">完全兼容 OpenAI 官方接口标准，现有项目无需改动代码，修改 BaseURL 和 Key 即可直接使用。</div>
                  </div>
                </div>
                <div className="why-item">
                  <div className="why-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                  </div>
                  <div>
                    <div className="why-title">企业级稳定性</div>
                    <div className="why-desc">采用高可用架构设计，自动负载均衡与故障转移，确保服务在高并发场景下依然稳定可靠。</div>
                  </div>
                </div>
                <div className="why-item">
                  <div className="why-icon">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                  </div>
                  <div>
                    <div className="why-title">全球节点覆盖</div>
                    <div className="why-desc">服务器节点遍布全球主要地区，自动选择最优线路，为全球用户提供低延迟的 API 访问体验。</div>
                  </div>
                </div>
                <div className="why-item">
                  <div className="why-icon">
                    <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                  </div>
                  <div>
                    <div className="why-title">以及更多...</div>
                    <div className="why-desc">支持流式响应、Function Calling、Embedding 等高级功能，满足各类复杂应用场景需求。</div>
                  </div>
                </div>
              </div>
              <div className="why-visual">
                <div className="radar">
                  <svg viewBox="-50 -50 400 360" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="radarFill" x1="150" y1="0" x2="150" y2="300" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#2E5CF6" stopOpacity="0.3"></stop>
                        <stop offset="1" stopColor="#06B6D4" stopOpacity="0.1"></stop>
                      </linearGradient>
                      <linearGradient id="radarStroke" x1="150" y1="0" x2="150" y2="300" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#2E5CF6"></stop>
                        <stop offset="1" stopColor="#06B6D4"></stop>
                      </linearGradient>
                    </defs>
                    <g className="radar-grid">
                      <polygon points="150,20 273,92 273,235 150,307 27,235 27,92" opacity="0.3"></polygon>
                      <polygon points="150,70 230,118 230,209 150,257 70,209 70,118" opacity="0.5"></polygon>
                      <polygon points="150,110 185,130 185,180 150,200 115,180 115,130" opacity="0.7"></polygon>
                      <polygon points="150,20 273,92 273,235 150,307 27,235 27,92"></polygon>
                      <line x1="150" y1="163" x2="150" y2="20"></line>
                      <line x1="150" y1="163" x2="273" y2="92"></line>
                      <line x1="150" y1="163" x2="273" y2="235"></line>
                      <line x1="150" y1="163" x2="150" y2="307"></line>
                      <line x1="150" y1="163" x2="27" y2="235"></line>
                      <line x1="150" y1="163" x2="27" y2="92"></line>
                    </g>
                    <polygon className="radar-data" points="150,35 260,100 250,225 150,290 80,210 50,110"></polygon>

                    <text x="150" y="10" textAnchor="middle" className="radar-label l1">响应速度</text>
                    <text x="290" y="90" textAnchor="middle" className="radar-label l2">稳定性</text>
                    <text x="290" y="250" textAnchor="middle" className="radar-label l3">价格优势</text>
                    <text x="150" y="330" textAnchor="middle" className="radar-label l4">并发能力</text>
                    <text x="10" y="250" textAnchor="middle" className="radar-label l5">易用性</text>
                    <text x="10" y="90" textAnchor="middle" className="radar-label l6">功能丰富</text>
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* Supported Models Section */}
          <section className="supported-models" id="supported-models">
            <h2 className="advantages-title">支持的模型</h2>
            <p className="advantages-subtitle">统一网关深度兼容主流与新锐模型厂商，持续扩容与适配，随时即用。</p>
            <div className="models-container">
              <div className="model-logo" title="OpenAI">
                <img src="/aisvg/openai.svg" alt="OpenAI" /><span className="model-name">OpenAI</span>
              </div>
              <div className="model-logo" title="Anthropic Claude">
                <img src="/aisvg/Claude.svg" alt="Claude" /><span className="model-name">Anthropic</span>
              </div>
              <div className="model-logo" title="Google Gemini">
                <img src="/aisvg/gemini.svg" alt="Gemini" /><span className="model-name">Google</span>
              </div>
              <div className="model-logo" title="DeepSeek">
                <img src="/aisvg/DeepSeek.svg" alt="DeepSeek" /><span className="model-name">DeepSeek</span>
              </div>
              <div className="model-logo" title="阿里通义 Qwen">
                <img src="/aisvg/Qwen.svg" alt="Qwen" /><span className="model-name">Qwen</span>
              </div>
              <div className="model-logo" title="Midjourney">
                <img src="/zhuye/Midjourney.svg" alt="Midjourney" /><span className="model-name">Midjourney</span>
              </div>
              <div className="model-logo" title="讯飞星火">
                <img src="/aisvg/spark-color.svg" alt="Spark" /><span className="model-name">Spark</span>
              </div>
              <div className="model-logo" title="月之暗面 Moonshot">
                <img src="/aisvg/moonshot.png" alt="Moonshot" /><span className="model-name">Moonshot</span>
              </div>
              <div className="model-logo" title="MiniMax">
                <img src="/aisvg/MiniMax.svg" alt="Minimax" /><span className="model-name">Minimax</span>
              </div>
              <div className="model-logo" title="智谱 GLM">
                <img src="/aisvg/zhipu.svg" alt="Zhipu" /><span className="model-name">Zhipu</span>
              </div>
              <div className="model-logo" title="xAI Grok">
                <img src="/aisvg/XAI.svg" alt="Grok" /><span className="model-name">Grok (xAI)</span>
              </div>
              <div className="model-logo" title="Suno">
                <img src="/aisvg/suno.svg" alt="Suno" /><span className="model-name">Suno</span>
              </div>
              <div className="model-logo" title="Hunyuan">
                <img src="/aisvg/hunyuan.svg" alt="Hunyuan" /><span className="model-name">Hunyuan</span>
              </div>

              <div className="model-logo" title="Mistral">
                <img src="/aisvg/mistral.svg" alt="Mistral" /><span className="model-name">Mistral</span>
              </div>
              <div className="model-logo" title="Yi">
                <img src="/aisvg/yi-color.svg" alt="Yi" /><span className="model-name">Yi</span>
              </div>
              <div className="model-logo" title="可灵">
                <img src="/aisvg/kling-color.svg" alt="可灵" /><span className="model-name">可灵</span>
              </div>
              <div className="model-logo" title="Flux">
                <img src="/aisvg/flux.svg" alt="Flux" /><span className="model-name">Flux</span>
              </div>
              <div className="model-logo" title="Luma">
                <img src="/aisvg/luma-color.svg" alt="Luma" /><span className="model-name">Luma</span>
              </div>
              <div className="model-logo" title="Runway">
                <img src="/aisvg/runway.svg" alt="Runway" /><span className="model-name">Runway</span>
              </div>
              <a className="model-logo" title="更多..." href="/pricing">
                <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" stroke="#CBD5E1" fill="none"></circle>
                  <circle cx="9" cy="12" r="1.5" fill="#94A3B8"></circle>
                  <circle cx="12" cy="12" r="1.5" fill="#94A3B8"></circle>
                  <circle cx="15" cy="12" r="1.5" fill="#94A3B8"></circle>
                </svg><span class="model-name">更多...</span>
              </a>
            </div>
          </section>

          {/* Quick Start Section */}
          <div className="bg-gradient-to-b from-white to-indigo-50/50 py-16 md:py-20 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 dark:text-gray-100">快速开始使用</h2>
                <p className="text-lg text-gray-600 dark:text-gray-400">支持多种 API 格式和功能，无缝对接您的应用</p>
              </div>
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8 dark:bg-gray-800 dark:border-gray-700">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sparkles w-4 h-4"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
                    格式调用
                  </h3>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-indigo-50/50 rounded-lg dark:bg-indigo-900/20">
                    <div className="flex-shrink-0 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xs">1</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 font-medium text-sm mb-1 dark:text-gray-300">原地址：</p>
                      <code className="px-2 py-1 bg-gray-100 text-gray-600 rounded font-mono text-xs line-through inline-block dark:bg-gray-700 dark:text-gray-400">https://api.openai.com</code>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-purple-50/50 rounded-lg dark:bg-purple-900/20">
                    <div className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-700 font-medium text-sm mb-2 dark:text-gray-300">新地址：</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        <div className="flex flex-col">
                          <p className="text-gray-600 text-xs font-medium mb-1 dark:text-gray-400">香港接口：</p>
                          <div className="flex items-center gap-1 flex-wrap bg-white p-2 rounded border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                            <code className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded font-mono text-xs font-semibold flex-1 min-w-0 truncate dark:bg-indigo-900 dark:text-indigo-300">https://api.26351.com</code>
                            <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('https://api.26351.com')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-gray-600 text-xs font-medium mb-1 dark:text-gray-400">空白代理接口：</p>
                          <div className="flex items-center gap-1 flex-wrap bg-white p-2 rounded border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                            <code className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-mono text-xs font-semibold flex-1 min-w-0 truncate dark:bg-purple-900 dark:text-purple-300">https://api.26351.com</code>
                            <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('https://api.26351.com')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <p className="text-gray-600 text-xs font-medium mb-1 dark:text-gray-400">美国接口：</p>
                          <div className="flex items-center gap-1 flex-wrap bg-white p-2 rounded border border-gray-200 dark:bg-gray-700 dark:border-gray-600">
                            <code className="px-2 py-0.5 bg-green-100 text-green-700 rounded font-mono text-xs font-semibold flex-1 min-w-0 truncate dark:bg-green-900 dark:text-green-300">https://api.26351.com</code>
                            <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('https://api.26351.com')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                    <div className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold">!</div>
                    <p className="text-amber-800 text-xs dark:text-amber-200"><span className="font-semibold">提示：</span>完全兼容国内外主流API格式</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center dark:text-gray-100">支持的 API 格式</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* API Card 1: OpenAI Chat */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle w-6 h-6 text-white"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>
                        <h4 className="text-lg font-semibold text-white">OpenAI对话接口</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">OpenAI 聊天对话接口，支持多轮对话</p>
                      <div className="flex items-center gap-2 flex-wrap bg-indigo-50 p-3 rounded-lg border border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800">
                        <code className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-indigo-900 dark:text-indigo-300">/v1/chat/completions</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1/chat/completions')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 2: OpenAI Response */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-network w-6 h-6 text-white"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></svg>
                        <h4 className="text-lg font-semibold text-white">OpenAI 响应式接口</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">OpenAI 响应式接口，支持实时流式响应处理</p>
                      <div className="flex items-center gap-2 flex-wrap bg-teal-50 p-3 rounded-lg border border-teal-200 dark:bg-teal-900/20 dark:border-teal-800">
                        <code className="px-2 py-1 bg-teal-100 text-teal-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-teal-900 dark:text-teal-300">/v1/responses</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1/responses')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 3: Claude */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain w-6 h-6 text-white"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path></svg>
                        <h4 className="text-lg font-semibold text-white">Claude 格式</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">Anthropic Claude 模型调用，支持多轮对话和高级推理</p>
                      <div className="flex items-center gap-2 flex-wrap bg-blue-50 p-3 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                        <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-blue-900 dark:text-blue-300">/v1/messages</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1/messages')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 4: Gemini */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-zap w-6 h-6 text-white"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                        <h4 className="text-lg font-semibold text-white">Gemini 格式</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">Google Gemini 模型调用，支持多模态内容处理</p>
                      <div className="flex items-center gap-2 flex-wrap bg-green-50 p-3 rounded-lg border border-green-200 dark:bg-green-900/20 dark:border-green-800">
                        <code className="px-2 py-1 bg-green-100 text-green-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-green-900 dark:text-green-300">/v1beta/models/</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1beta/models/')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 5: Image Gen */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image w-6 h-6 text-white"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                        <h4 className="text-lg font-semibold text-white">生图接口</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">DALL-E 图像生成，支持文本到图像的转换</p>
                      <div className="flex items-center gap-2 flex-wrap bg-purple-50 p-3 rounded-lg border border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
                        <code className="px-2 py-1 bg-purple-100 text-purple-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-purple-900 dark:text-purple-300">/v1/images/generations</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1/images/generations')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 6: Edit Image (Added based on Reference HTML) */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-pink-500 to-pink-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-square-pen w-6 h-6 text-white"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
                        <h4 className="text-lg font-semibold text-white">编辑图片</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">图像编辑和处理，支持图片修改和优化</p>
                      <div className="flex items-center gap-2 flex-wrap bg-pink-50 p-3 rounded-lg border border-pink-200 dark:bg-pink-900/20 dark:border-pink-800">
                        <code className="px-2 py-1 bg-pink-100 text-pink-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-pink-900 dark:text-pink-300">/v1/images/edits</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1/images/edits')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 7: Video (Added based on Reference HTML) */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-video w-6 h-6 text-white"><path d="m22 8-6 4 6 4V8Z"></path><rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect></svg>
                        <h4 className="text-lg font-semibold text-white">视频接口</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">视频处理和生成，支持视频创建和编辑</p>
                      <div className="flex items-center gap-2 flex-wrap bg-red-50 p-3 rounded-lg border border-red-200 dark:bg-red-900/20 dark:border-red-800">
                        <code className="px-2 py-1 bg-red-100 text-red-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-red-900 dark:text-red-300">/v1/videos</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1/videos')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 8: Text Embed */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cpu w-6 h-6 text-white"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M15 2v2"></path><path d="M15 20v2"></path><path d="M2 15h2"></path></svg>
                        <h4 className="text-lg font-semibold text-white">文本嵌入</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">文本向量化处理，支持语义搜索和相似度计算</p>
                      <div className="flex items-center gap-2 flex-wrap bg-orange-50 p-3 rounded-lg border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
                        <code className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-orange-900 dark:text-orange-300">/v1/embeddings</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1/embeddings')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 9: Suno Music */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-music w-6 h-6 text-white"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                        <h4 className="text-lg font-semibold text-white">Suno 音乐</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">Suno AI 音乐生成，支持文本到音乐的创作</p>
                      <div className="flex items-center gap-2 flex-wrap bg-cyan-50 p-3 rounded-lg border border-cyan-200 dark:bg-cyan-900/20 dark:border-cyan-800">
                        <code className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-cyan-900 dark:text-cyan-300">/suno/submit/music</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/suno/submit/music')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 10: Midjourney */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-palette w-6 h-6 text-white"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"></circle><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"></circle><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"></circle><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>
                        <h4 className="text-lg font-semibold text-white">Midjourney 绘图</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">Midjourney AI 绘图，支持高质量图像生成</p>
                      <div className="flex items-center gap-2 flex-wrap bg-fuchsia-50 p-3 rounded-lg border border-fuchsia-200 dark:bg-fuchsia-900/20 dark:border-fuchsia-800">
                        <code className="px-2 py-1 bg-fuchsia-100 text-fuchsia-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-fuchsia-900 dark:text-fuchsia-300">/mj/submit/imagine</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/mj/submit/imagine')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                  {/* API Card 11: Support More */}
                  <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all dark:bg-gray-800 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-slate-500 to-slate-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-network w-6 h-6 text-white"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></svg>
                        <h4 className="text-lg font-semibold text-white">支持更多API</h4>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-gray-600 text-sm dark:text-gray-400">支持更多API接口和高级功能</p>
                      <div className="flex items-center gap-2 flex-wrap bg-slate-50 p-3 rounded-lg border border-slate-200 dark:bg-slate-900/20 dark:border-slate-800">
                        <code className="px-2 py-1 bg-slate-100 text-slate-700 rounded font-mono text-xs font-semibold flex-1 dark:bg-slate-900 dark:text-slate-300">/v1/custom/*</code>
                        <button className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-all" title="复制链接" type="button" onClick={() => copyText('/v1/custom/*')}><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy w-4 h-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                      </div>
                    </div>
                  </div>

                </div>

                <div className="mt-12 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 overflow-hidden dark:from-gray-800 dark:to-gray-800 dark:border-gray-700">
                  <div className="p-8 md:p-10">
                    <div className="flex items-start gap-4 md:gap-6">
                      <div className="flex-shrink-0">
                        <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-info h-6 w-6 text-white"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 dark:text-gray-100">还有更多接口和功能</h3>
                        <p className="text-gray-700 mb-4 dark:text-gray-300">除了上述接口外，我们的平台还支持更多高级功能和定制化接口。无论您需要什么样的 AI 能力，我们都能为您提供完整的解决方案。</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Success Cases Section */}
          <div className="relative z-10 bg-white dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
              <div className="text-center mb-20">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 dark:text-white">客户成功案例</h2>
                <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed dark:text-gray-400">来自各行业的企业客户已通过我们的平台实现了业务创新和效率提升</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
                {/* Testimonial 1 */}
                <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-xl group dark:bg-gray-800 dark:border-gray-700 dark:hover:border-indigo-500">
                  <div className="flex items-start mb-6">
                    <img src="https://image.177911.com/image/w-x-j-t-1.jpg" alt="张总" className="w-14 h-14 rounded-full object-cover mr-4 ring-2 ring-indigo-100 dark:ring-indigo-900" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg dark:text-white">张总</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">CEO @ 某电商平台</p>
                    </div>
                  </div>
                  <div className="flex mb-4 gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-5 h-5 text-amber-400 fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base dark:text-gray-300">知来聚合API帮助我们显著提升了客户服务效率，智能对话系统让客服团队工作量减少了60%。</p>
                </div>
                {/* Testimonial 2 */}
                <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-xl group dark:bg-gray-800 dark:border-gray-700 dark:hover:border-indigo-500">
                  <div className="flex items-start mb-6">
                    <img src="https://image.177911.com/image/w-x-j-t-3.jpg" alt="李设计师" className="w-14 h-14 rounded-full object-cover mr-4 ring-2 ring-indigo-100 dark:ring-indigo-900" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg dark:text-white">李设计师</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">创意总监 @ 某设计公司</p>
                    </div>
                  </div>
                  <div className="flex mb-4 gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-5 h-5 text-amber-400 fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base dark:text-gray-300">作为一名设计师，知来聚合API的图像生成功能给了我无限创作灵感，大大提升了工作效率。</p>
                </div>
                {/* Testimonial 3 */}
                <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-indigo-200 transition-all duration-300 hover:shadow-xl group dark:bg-gray-800 dark:border-gray-700 dark:hover:border-indigo-500">
                  <div className="flex items-start mb-6">
                    <img src="https://image.177911.com/image/w-x-j-t-2.jpg" alt="王总" className="w-14 h-14 rounded-full object-cover mr-4 ring-2 ring-indigo-100 dark:ring-indigo-900" />
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900 text-lg dark:text-white">王总</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">CTO @ 某科技公司</p>
                    </div>
                  </div>
                  <div className="flex mb-4 gap-1">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-5 h-5 text-amber-400 fill-current"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    ))}
                  </div>
                  <p className="text-gray-700 leading-relaxed text-base dark:text-gray-300">企业版的私有化部署方案完美满足了我们对数据安全的严格要求，技术支持也非常专业。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="transition-all duration-1000 opacity-100 translate-y-0">
            <div className="relative faq-section bg-gradient-to-b from-white via-indigo-50 to-white dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
              {/* Particles Container */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20" style={{ minHeight: '200px' }}>
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="particle" style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    width: `${Math.random() * 3 + 1}px`,
                    height: `${Math.random() * 3 + 1}px`,
                    animationDelay: `${Math.random() * 2}s`,
                    color: Math.random() > 0.5 ? '#4F46E5' : '#06B6D4'
                  }}></div>
                ))}
              </div>
            </div>

            <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-12">
                  <div className="lg:col-span-3 space-y-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-3 dark:text-white">关于我们</h3>
                      <p className="text-gray-600 leading-relaxed text-sm dark:text-gray-400">知来API 专注于为开发者提供稳定高速的一站式大语言模型 API 中转服务，支持 OpenAI GPT、Anthropic Claude、Midjourney、Google Gemini、阿里云百炼、腾讯混元等主流 LLM，统一鉴权、灵活计费、智能负载均衡，助你低成本接入多模型 AI 能力。</p>
                    </div>
                  </div>
                  <div className="lg:col-span-3">
                    <h3 className="text-lg font-bold text-gray-900 mb-6 dark:text-white">快速链接</h3>
                    <ul className="space-y-3">
                      <li><a href="https://api.26351.com" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm dark:text-gray-400 dark:hover:text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>聚合API接入</a></li>
                      <li><a href="https://www.26351.com/" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm dark:text-gray-400 dark:hover:text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>聚合AI按次</a></li>
                      <li><a href="https://www.8852.com.cn/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm dark:text-gray-400 dark:hover:text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>聚合AI营销</a></li>
                      <li><a href="https://www.177911.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm dark:text-gray-400 dark:hover:text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>聚合IDC</a></li>
                    </ul>
                  </div>
                  <div className="lg:col-span-6 grid grid-cols-2 gap-8 md:gap-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-center group">
                        <div className="bg-white p-4 rounded-lg shadow-md inline-block transform transition-transform duration-300 group-hover:scale-105 dark:bg-gray-800">
                          <img src="https://image.177911.com/image/qrcode_for_gh_3674cdc88ed6_258.jpg" alt="企业微信" className="w-32 h-32 object-cover rounded-lg" />
                        </div>
                        <p className="mt-4 text-gray-700 font-medium dark:text-gray-300">企业微信</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-center group">
                        <div className="bg-white p-4 rounded-lg shadow-md inline-block transform transition-transform duration-300 group-hover:scale-105 dark:bg-gray-800">
                          <img src="https://image.177911.com/image/personal-wechat.jpg" alt="微信客服" className="w-32 h-32 object-cover rounded-lg" />
                        </div>
                        <p className="mt-4 text-gray-700 font-medium dark:text-gray-300">微信客服</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-8 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-gray-600 text-sm dark:text-gray-400">© 2025 知来API. All rights reserved.</p>
                    <p className="text-gray-500 text-xs mt-2 dark:text-gray-500">我们尊重客户隐私，不保留聊天记录。国内用户请遵守生成式人工智能服务管理暂行办法。</p>
                  </div>
                </div>
              </div>
            </footer>
          </div>

        </>
      ) : (
        <div style={{ fontSize: '1.2rem' }} dangerouslySetInnerHTML={{ __html: homePageContent }}></div>
      )}
    </div>
  );
};

export default Home;
