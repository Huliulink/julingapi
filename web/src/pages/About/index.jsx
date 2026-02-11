import React from 'react';
import { useActualTheme } from '../../context/Theme';
import FooterBar from '../../components/layout/Footer';
import './About.css';

const About = () => {
  const theme = useActualTheme();
  const isDark = theme === 'dark';

  return (
    <>
      <div className={`about-container ${isDark ? 'dark-theme' : ''}`}>
        {/* Hero */}
        <section className="about-hero">
          <div className="about-hero-badge"><span className="dot"></span> 关于聚灵API</div>
          <h1>一个key用<span>全球大模型</span></h1>
          <p>聚智成灵，赋能未来</p>
        </section>

        {/* 平台简介 */}
        <section className="about-section">
          <h2 className="about-section-title">平台简介</h2>
          <p>聚灵API 是专为AI时代打造的人工智能大模型API聚合平台，致力于为AI开发程序员提供先进、便捷、高效的大模型接入服务。作为行业领先的API聚合解决方案，聚灵API让开发者能够轻松驾驭全球顶尖的AI大模型资源。</p>
        </section>

        {/* 品牌理念 */}
        <section className="about-section">
          <h2 className="about-section-title">品牌理念</h2>
          <div className="about-highlight">
            聚智成灵，赋能未来。聚灵API，聚合全球AI灵能，释放数字生态潜能。
          </div>
        </section>

        {/* 核心理念 */}
        <section className="about-section">
          <h2 className="about-section-title">核心理念</h2>
          <div className="about-cards">
            <div className="about-card">
              <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h3>灵聚万象</h3>
              <ul>
                <li>打造AI能力的"灵气枢纽"，汇聚计算机视觉、自然语言处理、机器学习等前沿技术</li>
                <li>通过标准化API接口实现多模态AI能力的自由组合</li>
                <li>建立开发者生态，让每个创新灵感都能找到合适的技术载体</li>
              </ul>
            </div>
            <div className="about-card">
              <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              </div>
              <h3>灵启万物</h3>
              <ul>
                <li>提供"开箱即用"的智能解决方案，降低AI应用门槛</li>
                <li>支持企业快速调用最适合的AI模块组合，像搭积木一样构建智能系统</li>
                <li>通过智能路由和自动优化，确保API调用的高效稳定</li>
              </ul>
            </div>
            <div className="about-card">
              <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                <svg viewBox="0 0 24 24"><path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z"/></svg>
              </div>
              <h3>灵生无限</h3>
              <ul>
                <li>构建AI能力持续进化的生态系统</li>
                <li>开发者可贡献模型获得算力激励，形成技术共享闭环</li>
                <li>通过使用反馈不断优化模型性能，实现平台与用户共同成长</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 价值主张 */}
        <section className="about-section">
          <h2 className="about-section-title">价值主张</h2>
          <div className="about-cards">
            <div className="about-card" style={{ textAlign: 'center' }}>
              <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              </div>
              <h3>对开发者</h3>
              <p>提供"一站式AI能力商城"，缩短从想法到产品的距离</p>
            </div>
            <div className="about-card" style={{ textAlign: 'center' }}>
              <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </div>
              <h3>对企业客户</h3>
              <p>打造"可进化的智能中枢"，随业务需求灵活扩展AI能力</p>
            </div>
            <div className="about-card" style={{ textAlign: 'center' }}>
              <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)', margin: '0 auto 1rem' }}>
                <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>对模型提供方</h3>
              <p>构建"价值循环生态"，让优质算法获得应有回报</p>
            </div>
          </div>
        </section>

        {/* 技术特色 */}
        <section className="about-section">
          <h2 className="about-section-title">技术特色</h2>
          <ul className="about-tech-list">
            <li><span className="about-tech-dot"></span><strong>智能API网关：</strong>自动选择最优算法组合</li>
            <li><span className="about-tech-dot"></span><strong>动态负载均衡：</strong>保障高并发场景稳定性</li>
            <li><span className="about-tech-dot"></span><strong>模型炼金工坊：</strong>支持自定义模型微调</li>
          </ul>
        </section>

        {/* 核心服务 */}
        <section className="about-section">
          <div className="about-core">
            <h2 className="about-core-title">核心服务</h2>
            <div className="about-core-key">
              <svg viewBox="0 0 24 24"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>
              一个key用全球大模型
            </div>
            <p>这是聚灵API的核心价值主张。我们深知开发者在面对众多AI大模型时的困扰：不同的API接口、复杂的认证流程、分散的计费系统。因此，我们提供了革命性的解决方案——仅需一个API Key，即可无缝接入全球各大AI模型。</p>
            <div className="about-cards">
              <div className="about-card" style={{ textAlign: 'center' }}>
                <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', margin: '0 auto 1rem' }}>
                  <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <h3>日志统一</h3>
                <p>所有模型调用记录集中管理，便于监控和调试</p>
              </div>
              <div className="about-card" style={{ textAlign: 'center' }}>
                <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', margin: '0 auto 1rem' }}>
                  <svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <h3>计费统一</h3>
                <p>一套透明的计费体系，告别繁琐的多平台账单</p>
              </div>
              <div className="about-card" style={{ textAlign: 'center' }}>
                <div className="about-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', margin: '0 auto 1rem' }}>
                  <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h3>商务统一</h3>
                <p>一次商务对接，享受全球大模型资源</p>
              </div>
            </div>
            <p>通过聚灵API，开发者可以专注于AI应用的创新与开发，而无需为复杂的基础设施集成而烦恼。我们让AI开发变得更简单、更高效。</p>
          </div>
        </section>
      </div>
      <FooterBar />
    </>
  );
};

export default About;
