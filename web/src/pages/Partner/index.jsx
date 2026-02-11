import React from 'react';
import { useActualTheme } from '../../context/Theme';
import './Partner.css';

const Partner = () => {
  const theme = useActualTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`partner-container ${isDark ? 'dark-theme' : ''}`}>
      {/* Hero */}
      <section className="partner-hero">
        <div className="partner-hero-badge"><span className="dot"></span> 聚灵API 合伙人计划</div>
        <h1>成为合伙人，<span>共享收益</span></h1>
        <p>加入聚灵API合伙人计划，推广即可获得持续佣金收益。无需技术门槛，分享链接即可开始赚取被动收入，佣金实时到账。</p>
        <a className="partner-hero-btn" href="/register">
          立即加入
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
      </section>

      {/* Stats */}
      <div className="partner-stats">
        <div className="partner-stat-card">
          <div className="partner-stat-number">20%</div>
          <div className="partner-stat-label">推广佣金比例</div>
        </div>
        <div className="partner-stat-card">
          <div className="partner-stat-number">T+1</div>
          <div className="partner-stat-label">佣金结算周期</div>
        </div>
        <div className="partner-stat-card">
          <div className="partner-stat-number">永久</div>
          <div className="partner-stat-label">用户绑定时长</div>
        </div>
        <div className="partner-stat-card">
          <div className="partner-stat-number">0元</div>
          <div className="partner-stat-label">加入门槛</div>
        </div>
      </div>

      {/* Benefits */}
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

      {/* Steps */}
      <section className="partner-section" style={{ paddingTop: 0 }}>
        <h2 className="partner-section-title">如何成为合伙人</h2>
        <p className="partner-section-sub">只需四步，轻松开启你的推广之旅</p>
        <div className="partner-steps">
          <div className="partner-step">
            <div className="partner-step-num">1</div>
            <h3>注册账号</h3>
            <p>在聚灵API平台注册一个账号，完全免费，无需任何费用。</p>
          </div>
          <div className="partner-step">
            <div className="partner-step-num">2</div>
            <h3>获取推广链接</h3>
            <p>登录控制台，在个人设置中获取你的专属推广链接和邀请码。</p>
          </div>
          <div className="partner-step">
            <div className="partner-step-num">3</div>
            <h3>分享推广</h3>
            <p>将推广链接分享到社交媒体、技术社区、博客等渠道吸引用户注册。</p>
          </div>
          <div className="partner-step">
            <div className="partner-step-num">4</div>
            <h3>获得佣金</h3>
            <p>推荐用户产生消费后，佣金自动计入你的账户，随时可提现。</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="partner-section" style={{ paddingTop: 0 }}>
        <div className="partner-cta">
          <h2>立即加入聚灵API合伙人计划</h2>
          <p>零门槛、高佣金、永久绑定，开启你的被动收入之旅</p>
          <a className="partner-hero-btn" href="/register">
            免费注册，立即开始
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        </div>
      </section>
    </div>
  );
};

export default Partner;
