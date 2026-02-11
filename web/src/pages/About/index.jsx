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
              <div className="about-card-icon">
                <img src="/about/万物安全.svg" alt="灵聚万象" />
              </div>
              <h3>灵聚万象</h3>
              <ul>
                <li>打造AI能力的"灵气枢纽"，汇聚计算机视觉、自然语言处理、机器学习等前沿技术</li>
                <li>通过标准化API接口实现多模态AI能力的自由组合</li>
                <li>建立开发者生态，让每个创新灵感都能找到合适的技术载体</li>
              </ul>
            </div>
            <div className="about-card">
              <div className="about-card-icon">
                <img src="/about/灵启万物.svg" alt="灵启万物" />
              </div>
              <h3>灵启万物</h3>
              <ul>
                <li>提供"开箱即用"的智能解决方案，降低AI应用门槛</li>
                <li>支持企业快速调用最适合的AI模块组合，像搭积木一样构建智能系统</li>
                <li>通过智能路由和自动优化，确保API调用的高效稳定</li>
              </ul>
            </div>
            <div className="about-card">
              <div className="about-card-icon">
                <img src="/about/灵生无限.svg" alt="灵生无限" />
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
              <div className="about-card-icon" style={{ margin: '0 auto 1rem' }}>
                <img src="/about/对开发者.svg" alt="对开发者" />
              </div>
              <h3>对开发者</h3>
              <p>提供"一站式AI能力商城"，缩短从想法到产品的距离</p>
            </div>
            <div className="about-card" style={{ textAlign: 'center' }}>
              <div className="about-card-icon" style={{ margin: '0 auto 1rem' }}>
                <img src="/about/对企业客户.svg" alt="对企业客户" />
              </div>
              <h3>对企业客户</h3>
              <p>打造"可进化的智能中枢"，随业务需求灵活扩展AI能力</p>
            </div>
            <div className="about-card" style={{ textAlign: 'center' }}>
              <div className="about-card-icon" style={{ margin: '0 auto 1rem' }}>
                <img src="/about/对模型提供方.svg" alt="对模型提供方" />
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
            <li><span className="about-tech-dot"></span><strong>智能API网关：</strong>基于深度学习的智能路由引擎，自动分析请求特征并选择最优模型与算法组合，实现毫秒级智能调度决策</li>
            <li><span className="about-tech-dot"></span><strong>动态负载均衡：</strong>多维度实时监控系统健康状态，结合自适应权重算法动态分配流量，保障高并发场景下99.9%的服务可用性</li>
            <li><span className="about-tech-dot"></span><strong>模型炼金工坊：</strong>提供可视化模型微调平台，支持LoRA、QLoRA等主流微调方案，让企业用自有数据快速定制专属AI模型</li>
            <li><span className="about-tech-dot"></span><strong>统一协议适配：</strong>深度兼容OpenAI、Claude、Gemini等40+主流大模型API协议，一套代码无缝切换不同供应商，零迁移成本</li>
            <li><span className="about-tech-dot"></span><strong>全链路可观测：</strong>从请求发起到响应返回的完整链路追踪，提供Token用量分析、延迟分布、错误率监控等多维度数据看板</li>
            <li><span className="about-tech-dot"></span><strong>企业级安全防护：</strong>内置敏感内容过滤、请求频率限制、API Key权限隔离与审计日志，全方位保障数据安全与合规</li>
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
                <div className="about-card-icon" style={{ margin: '0 auto 1rem' }}>
                  <img src="/about/日志统一.svg" alt="日志统一" />
                </div>
                <h3>日志统一</h3>
                <p>所有模型调用记录集中管理，便于监控和调试</p>
              </div>
              <div className="about-card" style={{ textAlign: 'center' }}>
                <div className="about-card-icon" style={{ margin: '0 auto 1rem' }}>
                  <img src="/about/计费统一.svg" alt="计费统一" />
                </div>
                <h3>计费统一</h3>
                <p>一套透明的计费体系，告别繁琐的多平台账单</p>
              </div>
              <div className="about-card" style={{ textAlign: 'center' }}>
                <div className="about-card-icon" style={{ margin: '0 auto 1rem' }}>
                  <img src="/about/商务统一.svg" alt="商务统一" />
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
