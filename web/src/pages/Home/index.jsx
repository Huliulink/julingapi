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

  useEffect(() => {
    displayStatus();
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
                <div className="app-name">ChatGPT API</div>
              </div>
              <div className="app-desc">智能对话与写作辅助，支持多轮交互。</div>
            </a>
            <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
              <div className="app-head">
                <div className="app-icon"><img src="/zhuye/Claude.svg" alt="Claude" /></div>
                <div className="app-name">Claude API</div>
              </div>
              <div className="app-desc">长文本分析与各种代码逻辑推理能力。</div>
            </a>
            <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
              <div className="app-head">
                <div className="app-icon"><img src="/zhuye/Midjourney.svg" alt="Midjourney" /></div>
                <div className="app-name">Midjourney API</div>
              </div>
              <div className="app-desc">高质量AI绘画，生成艺术级图像作品。</div>
            </a>
            <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
              <div className="app-head">
                <div className="app-icon"><img src="/zhuye/Sora_modle.svg" alt="Sora" /></div>
                <div className="app-name">Sora API</div>
              </div>
              <div className="app-desc">文本生成视频，创造逼真的动态场景。</div>
            </a>
            <a href="#" className="app-card" onClick={(e) => e.preventDefault()}>
              <div className="app-head">
                <div className="app-icon"><img src="/zhuye/gemini-ai.svg" alt="Gemini" /></div>
                <div className="app-name">Gemini API</div>
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
        <div style={{ background: isDark ? 'linear-gradient(to bottom, #111827, #1f2937)' : 'linear-gradient(to bottom, #ffffff, rgba(238,242,255,0.5))', padding: '4rem 0 5rem' }}>
          <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0 1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: isDark ? '#f3f4f6' : '#111827', marginBottom: '1rem' }}>快速开始使用</h2>
              <p style={{ fontSize: '1.125rem', color: isDark ? '#9ca3af' : '#4b5563' }}>支持多种 API 格式和功能，无缝对接您的应用</p>
            </div>
            <div style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '1rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', marginBottom: '2rem' }}>
              <div style={{ background: 'linear-gradient(to right, #4f46e5, #7c3aed)', padding: '0.75rem 1.5rem' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg>
                  格式调用
                </h3>
              </div>
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: isDark ? '#1f2937' : 'rgba(238,242,255,0.5)', borderRadius: '0.5rem' }}>
                  <div style={{ flexShrink: 0, width: '1.5rem', height: '1.5rem', background: '#4f46e5', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>1</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: isDark ? '#d1d5db' : '#374151', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.25rem' }}>原地址：</p>
                    <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#374151' : '#f3f4f6', color: isDark ? '#9ca3af' : '#4b5563', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', textDecoration: 'line-through', display: 'inline-block' }}>https://api.openai.com</code>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', background: isDark ? '#1f2937' : 'rgba(243,232,255,0.5)', borderRadius: '0.5rem' }}>
                  <div style={{ flexShrink: 0, width: '1.5rem', height: '1.5rem', background: '#7c3aed', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem' }}>2</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: isDark ? '#d1d5db' : '#374151', fontWeight: 500, fontSize: '0.875rem', marginBottom: '0.5rem' }}>新地址：</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>BASE_URL 1：</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', background: isDark ? '#374151' : '#fff', padding: '0.5rem', borderRadius: '0.25rem', border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb' }}>
                          <code style={{ padding: '0.125rem 0.5rem', background: isDark ? '#312e81' : '#e0e7ff', color: isDark ? '#a5b4fc' : '#4338ca', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>https://open.177911.com</code>
                          <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', transition: 'all 0.2s', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('https://open.177911.com')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>BASE_URL 2：</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', background: isDark ? '#374151' : '#fff', padding: '0.5rem', borderRadius: '0.25rem', border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb' }}>
                          <code style={{ padding: '0.125rem 0.5rem', background: isDark ? '#4a1d96' : '#f3e8ff', color: isDark ? '#c4b5fd' : '#7c3aed', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>https://open.177911.com/v1</code>
                          <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', transition: 'all 0.2s', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('https://open.177911.com/v1')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.75rem', fontWeight: 500, marginBottom: '0.25rem' }}>BASE_URL 3：</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', background: isDark ? '#374151' : '#fff', padding: '0.5rem', borderRadius: '0.25rem', border: isDark ? '1px solid #4b5563' : '1px solid #e5e7eb' }}>
                          <code style={{ padding: '0.125rem 0.5rem', background: isDark ? '#064e3b' : '#dcfce7', color: isDark ? '#6ee7b7' : '#15803d', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>https://open.177911.com/v1/chat/completions</code>
                          <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', transition: 'all 0.2s', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('https://open.177911.com/v1/chat/completions')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem', background: isDark ? '#422006' : '#fffbeb', borderRadius: '0.5rem', border: isDark ? '1px solid #854d0e' : '1px solid #fde68a' }}>
                  <div style={{ flexShrink: 0, width: '1.25rem', height: '1.25rem', background: '#f59e0b', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>!</div>
                  <p style={{ color: isDark ? '#fde68a' : '#92400e', fontSize: '0.75rem', margin: 0 }}><span style={{ fontWeight: 600 }}>提示：</span>完全兼容国内外主流API格式</p>
                </div>
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: isDark ? '#f3f4f6' : '#111827', marginBottom: '2rem', textAlign: 'center' }}>支持的 API 格式</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* API Card 1: OpenAI Chat */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #6366f1, #4f46e5)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"></path></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>OpenAI对话接口</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>OpenAI 聊天对话接口，支持多轮对话</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#312e81' : '#eef2ff', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #4338ca' : '1px solid #c7d2fe' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#3730a3' : '#e0e7ff', color: isDark ? '#a5b4fc' : '#4338ca', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1/chat/completions</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', transition: 'all 0.2s', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1/chat/completions')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 2: OpenAI Response */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #14b8a6, #0d9488)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>OpenAI 响应式接口</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>OpenAI 响应式接口，支持实时流式响应处理</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#134e4a' : '#f0fdfa', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #0d9488' : '1px solid #99f6e4' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#115e59' : '#ccfbf1', color: isDark ? '#5eead4' : '#0f766e', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1/responses</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', transition: 'all 0.2s', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1/responses')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 3: Claude */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>Claude 格式</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>Anthropic Claude 模型调用，支持多轮对话和高级推理</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#1e3a5f' : '#eff6ff', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #2563eb' : '1px solid #bfdbfe' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#1e40af' : '#dbeafe', color: isDark ? '#93c5fd' : '#1d4ed8', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1/messages</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1/messages')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 4: Gemini */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #22c55e, #16a34a)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>Gemini 格式</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>Google Gemini 模型调用，支持多模态内容处理</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#052e16' : '#f0fdf4', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #16a34a' : '1px solid #bbf7d0' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#064e3b' : '#dcfce7', color: isDark ? '#86efac' : '#15803d', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1beta/models/</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1beta/models/')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 5: Image Gen */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #a855f7, #9333ea)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>生图接口</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>DALL-E 图像生成，支持文本到图像的转换</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#3b0764' : '#faf5ff', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #9333ea' : '1px solid #e9d5ff' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#581c87' : '#f3e8ff', color: isDark ? '#d8b4fe' : '#7e22ce', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1/images/generations</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1/images/generations')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 6: Edit Image */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #ec4899, #db2777)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"></path></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>编辑图片</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>图像编辑和处理，支持图片修改和优化</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#500724' : '#fdf2f8', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #db2777' : '1px solid #fbcfe8' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#831843' : '#fce7f3', color: isDark ? '#f9a8d4' : '#be185d', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1/images/edits</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1/images/edits')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 7: Video */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #ef4444, #dc2626)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"></path><rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>视频接口</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>视频处理和生成，支持视频创建和编辑</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#450a0a' : '#fef2f2', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #dc2626' : '1px solid #fecaca' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#7f1d1d' : '#fee2e2', color: isDark ? '#fca5a5' : '#b91c1c', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1/videos</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1/videos')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 8: Text Embed */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #f97316, #ea580c)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><path d="M15 2v2"></path><path d="M15 20v2"></path><path d="M2 15h2"></path><path d="M2 9h2"></path><path d="M20 15h2"></path><path d="M20 9h2"></path><path d="M9 2v2"></path><path d="M9 20v2"></path></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>文本嵌入</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>文本向量化处理，支持语义搜索和相似度计算</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#431407' : '#fff7ed', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #ea580c' : '1px solid #fed7aa' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#7c2d12' : '#ffedd5', color: isDark ? '#fdba74' : '#c2410c', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1/embeddings</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1/embeddings')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 9: Suno Music */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #06b6d4, #0891b2)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>Suno 音乐</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>Suno AI 音乐生成，支持文本到音乐的创作</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#083344' : '#ecfeff', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #0891b2' : '1px solid #a5f3fc' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#164e63' : '#cffafe', color: isDark ? '#67e8f9' : '#0e7490', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/suno/submit/music</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/suno/submit/music')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 10: Midjourney */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #d946ef, #c026d3)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="white"></circle><circle cx="17.5" cy="10.5" r=".5" fill="white"></circle><circle cx="8.5" cy="7.5" r=".5" fill="white"></circle><circle cx="6.5" cy="12.5" r=".5" fill="white"></circle><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>Midjourney 绘图</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>Midjourney AI 绘图，支持高质量图像生成</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#4a044e' : '#fdf4ff', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #c026d3' : '1px solid #f0abfc' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#701a75' : '#fae8ff', color: isDark ? '#e879f9' : '#a21caf', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/mj/submit/imagine</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/mj/submit/imagine')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

                {/* API Card 11: Support More */}
                <div className="api-format-card" style={{ background: isDark ? '#1f2937' : '#fff', borderRadius: '0.75rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', border: isDark ? '1px solid #374151' : '1px solid #f3f4f6', overflow: 'hidden', transition: 'all 0.3s' }}>
                  <div style={{ background: 'linear-gradient(to right, #64748b, #475569)', padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="16" y="16" width="6" height="6" rx="1"></rect><rect x="2" y="16" width="6" height="6" rx="1"></rect><rect x="9" y="2" width="6" height="6" rx="1"></rect><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"></path><path d="M12 12V8"></path></svg>
                      <h4 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#fff', margin: 0 }}>支持更多API</h4>
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: '0.875rem', margin: 0 }}>支持更多API接口和高级功能</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', background: isDark ? '#1e293b' : '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: isDark ? '1px solid #475569' : '1px solid #e2e8f0' }}>
                      <code style={{ padding: '0.25rem 0.5rem', background: isDark ? '#334155' : '#f1f5f9', color: isDark ? '#94a3b8' : '#475569', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600, flex: 1 }}>/v1/custom/*</code>
                      <button style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.375rem', color: '#4f46e5', borderRadius: '0.25rem', border: 'none', background: 'none', cursor: 'pointer' }} title="复制链接" type="button" onClick={() => copyText('/v1/custom/*')}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg></button>
                    </div>
                  </div>
                </div>

              </div>

              <div style={{ marginTop: '3rem', background: isDark ? 'linear-gradient(to right, #1e1b4b, #312e81)' : 'linear-gradient(to right, #eef2ff, #e0e7ff)', borderRadius: '1rem', border: isDark ? '1px solid #4338ca' : '1px solid #c7d2fe', overflow: 'hidden' }}>
                <div style={{ padding: '2rem 2.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '3rem', width: '3rem', borderRadius: '0.5rem', background: 'linear-gradient(to bottom right, #4f46e5, #7c3aed)' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: isDark ? '#f3f4f6' : '#111827', marginBottom: '0.5rem' }}>还有更多接口和功能</h3>
                      <p style={{ color: isDark ? '#d1d5db' : '#374151', marginBottom: '1rem' }}>除了上述接口外，我们的平台还支持更多高级功能和定制化接口。无论您需要什么样的 AI 能力，我们都能为您提供完整的解决方案。</p>
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
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-5 h-5 fill-current" style={{ color: '#f7d13b' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
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
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-5 h-5 fill-current" style={{ color: '#f7d13b' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
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
                    <svg key={i} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-star w-5 h-5 fill-current" style={{ color: '#f7d13b' }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
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
                    <p className="text-gray-600 leading-relaxed text-sm dark:text-gray-400">聚灵API 专注于为开发者提供稳定高速的一站式大语言模型 API 中转服务，支持 OpenAI GPT、Anthropic Claude、Midjourney、Google Gemini、阿里云百炼、腾讯混元等主流 LLM，统一鉴权、灵活计费、智能负载均衡，助你低成本接入多模型 AI 能力。</p>
                  </div>
                </div>
                <div className="lg:col-span-3">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 dark:text-white">快速链接</h3>
                  <ul className="space-y-3">
                    <li><a href="https://www.177911.com" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm dark:text-gray-400 dark:hover:text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>聚灵AI导航</a></li>
                    <li><a href="https://www.177911.com/blog" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm dark:text-gray-400 dark:hover:text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>聚灵Blog</a></li>
                    <li><a href="https://open.177911.com/pricing" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm dark:text-gray-400 dark:hover:text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>模型广场</a></li>
                    <li><a href="https://julingapi.apifox.cn/" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm dark:text-gray-400 dark:hover:text-indigo-400"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right w-4 h-4"><path d="m9 18 6-6-6-6"></path></svg>技术文档</a></li>
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
                  <p className="text-gray-600 text-sm dark:text-gray-400">© 2025 聚灵API. All rights reserved.</p>
                  <p className="text-gray-500 text-xs mt-2 dark:text-gray-500">我们尊重客户隐私，不保留聊天记录。国内用户请遵守生成式人工智能服务管理暂行办法。</p>
                </div>
              </div>
            </div>
          </footer>
        </div>

      </>

    </div >
  );
};

export default Home;
