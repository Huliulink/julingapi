import React from 'react';
import { useActualTheme } from '../../context/Theme';
import FooterBar from '../../components/layout/Footer';
import './Partner.css';

const Partner = () => {
  const theme = useActualTheme();
  const isDark = theme === 'dark';

  return (
    <>
      <div className={`partner-container ${isDark ? 'dark-theme' : ''}`}>
        {/* Hero */}
        <section className="partner-hero">
          <div className="partner-hero-badge"><span className="dot"></span> 聚灵API 代理分销计划</div>
          <h1>成为专属合伙人</h1>
          <h2 className="partner-hero-sub">聚合力量，分享红利</h2>
          <p>无需API货源、无需维护模型，只需要一个域名+支付接口，即刻拥有跟本站一样的API平台，零库存、零技术、零风险。站上AI风口，让财富主动敲门！</p>
          <a className="fancy-btn" href="/register">
            <div className="fancy-btn__line" />
            <div className="fancy-btn__line" />
            <span className="fancy-btn__text">立即加入</span>
            <div className="fancy-btn__drow1" />
            <div className="fancy-btn__drow2" />
          </a>
        </section>

        {/* 核心优势 */}
        <div className="partner-features">
          <div className="partner-feature-card">
            <div className="partner-feature-icon">
              <img src="/partner/低成本起步.svg" alt="低成本起步" />
            </div>
            <h3>低成本起步</h3>
            <p>无需部署服务器、无需维护模型渠道、无需API备货和运营</p>
          </div>
          <div className="partner-feature-card">
            <div className="partner-feature-icon">
              <img src="/partner/完全定制化.svg" alt="完全定制化" />
            </div>
            <h3>完全定制化</h3>
            <p>支持自定义充值价格、Logo、公告、首页、SEO、易支付接入等所有内容</p>
          </div>
          <div className="partner-feature-card">
            <div className="partner-feature-icon">
              <img src="/partner/资金透明.svg" alt="资金透明" />
            </div>
            <h3>资金透明</h3>
            <p>用户充值直接到您账户，平台仅扣除代理余额，收益实时透明可查</p>
          </div>
          <div className="partner-feature-card">
            <div className="partner-feature-icon">
              <img src="/partner/技术支持.svg" alt="技术支持" />
            </div>
            <h3>技术支持</h3>
            <p>平台负责API渠道、服务器运维、技术迭代，您只需专注推广</p>
          </div>
        </div>

        {/* 合伙人专属权益 */}
        <section className="partner-section">
          <h2 className="partner-section-title">合伙人专属权益</h2>
          <p className="partner-section-sub">我们为每一位合伙人提供全方位的支持与丰厚回报</p>
          <div className="partner-benefits">
            <div className="partner-benefit-card">
              <div className="partner-benefit-icon" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3>高额佣金</h3>
              <p>推荐用户消费即可获得最高20%的持续佣金，用户每次充值你都有收益，长期被动收入。</p>
            </div>
            <div className="partner-benefit-card">
              <div className="partner-benefit-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <h3>实时追踪</h3>
              <p>专属合伙人后台，实时查看推广数据、用户消费、佣金明细，一切收益透明可见。</p>
            </div>
            <div className="partner-benefit-card">
              <div className="partner-benefit-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>专属客服</h3>
              <p>一对一专属客服支持，解答推广疑问，协助解决技术问题，助你高效推广。</p>
            </div>
            <div className="partner-benefit-card">
              <div className="partner-benefit-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              </div>
              <h3>推广素材</h3>
              <p>提供专业的推广素材、文案模板和营销工具，降低推广难度，提升转化效果。</p>
            </div>
            <div className="partner-benefit-card">
              <div className="partner-benefit-icon" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3>品牌保障</h3>
              <p>聚灵API拥有稳定的服务和良好的口碑，99.9%可用性让你推广无后顾之忧。</p>
            </div>
            <div className="partner-benefit-card">
              <div className="partner-benefit-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <h3>阶梯奖励</h3>
              <p>推广业绩达到阶梯目标可获得额外奖励，业绩越高佣金比例越高，上不封顶。</p>
            </div>
          </div>
        </section>

        {/* 如果你具备这些特点 */}
        <section className="partner-section partner-section-compact">
          <h2 className="partner-section-title">如果你具备这些特点</h2>
          <div className="partner-traits">
            <div className="partner-trait-card">
              <span className="partner-trait-emoji">&#x1F310;</span>
              <span>渠道资源多</span>
            </div>
            <div className="partner-trait-card">
              <span className="partner-trait-emoji">&#x1F91D;</span>
              <span>社交人脉广</span>
            </div>
            <div className="partner-trait-card">
              <span className="partner-trait-emoji">&#x2B50;</span>
              <span>粉丝基础强</span>
            </div>
            <div className="partner-trait-card">
              <span className="partner-trait-emoji">&#x23F0;</span>
              <span>空闲时间多</span>
            </div>
          </div>
          <p className="partner-trait-hint">&#x1F446; 满足以上任意一条，动动手指就能赚钱！</p>
        </section>

        {/* 适合人群 */}
        <section className="partner-section partner-section-compact">
          <h2 className="partner-section-title">适合人群</h2>
          <p className="partner-section-sub">无论您是什么职业，只要有推广能力，都能轻松获得收益</p>
          <div className="partner-audience">
            <div className="partner-audience-card">
              <div className="partner-audience-icon">
                <img src="/partner/在校大学生.svg" alt="在校大学生" />
              </div>
              <h3>在校大学生</h3>
              <p>课余时间充裕，通过简单推广获取额外收入，覆盖日常生活开销</p>
            </div>
            <div className="partner-audience-card">
              <div className="partner-audience-icon">
                <img src="/partner/自媒体博主.svg" alt="自媒体博主" />
              </div>
              <h3>自媒体博主</h3>
              <p>利用粉丝基础，文章或视频中自然植入，实现内容变现</p>
            </div>
            <div className="partner-audience-card">
              <div className="partner-audience-icon">
                <img src="/partner/项目拥有者.svg" alt="项目拥有者" />
              </div>
              <h3>项目拥有者</h3>
              <p>通过独立站、应用或开源项目推广，轻松实现收益最大化</p>
            </div>
            <div className="partner-audience-card">
              <div className="partner-audience-icon">
                <img src="/partner/自由职业者.svg" alt="自由职业者" />
              </div>
              <h3>自由职业者</h3>
              <p>时间自主安排，灵活参与分销，增加收入来源渠道</p>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="partner-section partner-section-compact">
          <h2 className="partner-section-title">如何成为代理</h2>
          <p className="partner-section-sub">简单四步，快速开启您的代理之旅</p>
          <div className="partner-steps">
            <div className="partner-step">
              <div className="partner-step-num">01</div>
              <h3>提交申请</h3>
              <p>联系管理员获取代理资格</p>
            </div>
            <div className="partner-step">
              <div className="partner-step-num">02</div>
              <h3>准备域名</h3>
              <p>购买或使用已有域名</p>
            </div>
            <div className="partner-step">
              <div className="partner-step-num">03</div>
              <h3>配置解析</h3>
              <p>添加 CNAME 记录指向平台</p>
            </div>
            <div className="partner-step">
              <div className="partner-step-num">04</div>
              <h3>开始运营</h3>
              <p>访问您的专属代理站点</p>
            </div>
          </div>
        </section>

        {/* 代理规则 */}
        <section className="partner-section partner-section-compact">
          <h2 className="partner-section-title">代理规则</h2>
          <p className="partner-section-sub">透明清晰的合作模式，让您无后顾之忧</p>
          <div className="partner-rules">
            <div className="partner-rule-card">
              <div className="partner-rule-icon" style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3>用户归属</h3>
              <p>用户通过您的代理域名注册，即与您建立代理关系，成为您的下级用户</p>
            </div>
            <div className="partner-rule-card">
              <div className="partner-rule-icon" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
                <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3>自由定价</h3>
              <p>您可以自由设置充值价格，用户按您的定价购买，资金直达您的账户</p>
            </div>
            <div className="partner-rule-card">
              <div className="partner-rule-icon" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
              </div>
              <h3>自动结算</h3>
              <p>系统自动扣除成本费用，剩余部分即为您的利润，资金流转透明可查</p>
            </div>
            <div className="partner-rule-card">
              <div className="partner-rule-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              <h3>灵活收款</h3>
              <p>支持易支付或兑换码收款，资金直接到您的微信/支付宝等账户</p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="partner-section partner-section-compact">
          <div className="partner-cta">
            <h2>立即加入聚灵API代理分销计划</h2>
            <p>零门槛、高佣金、永久绑定，开启你的被动收入之旅</p>
            <a className="fancy-btn fancy-btn--light" href="/register">
              <div className="fancy-btn__line" />
              <div className="fancy-btn__line" />
              <span className="fancy-btn__text">免费注册，立即开始</span>
              <div className="fancy-btn__drow1" />
              <div className="fancy-btn__drow2" />
            </a>
          </div>
        </section>
      </div>
      <FooterBar />
    </>
  );
};

export default Partner;
