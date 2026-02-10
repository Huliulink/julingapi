import React from 'react';

const WebFooter = () => {
    return (
        <footer className="bg-gradient-to-b from-gray-50 to-gray-100 border-t border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-12">
                    <div className="lg:col-span-3 space-y-6">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-3">关于我们</h3>
                            <p className="text-gray-600 leading-relaxed text-sm">
                                知来API
                                专注于为开发者提供稳定高速的一站式大语言模型 API
                                中转服务，支持 OpenAI GPT、Anthropic Claude、Midjourney、Google
                                Gemini、阿里云百炼、腾讯混元等主流 LLM，统一鉴权、灵活计费、智能负载均衡，助你低成本接入多模型 AI
                                能力。
                            </p>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">快速链接</h3>
                        <ul className="space-y-3">
                            <li>
                                <a
                                    href="https://api.26351.com"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-chevron-right w-4 h-4"
                                    >
                                        <path d="m9 18 6-6-6-6"></path>
                                    </svg>
                                    聚合API接入
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.26351.com/"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-chevron-right w-4 h-4"
                                    >
                                        <path d="m9 18 6-6-6-6"></path>
                                    </svg>
                                    聚合AI按次
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.8852.com.cn/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-chevron-right w-4 h-4"
                                    >
                                        <path d="m9 18 6-6-6-6"></path>
                                    </svg>
                                    聚合AI营销
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://www.177911.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="lucide lucide-chevron-right w-4 h-4"
                                    >
                                        <path d="m9 18 6-6-6-6"></path>
                                    </svg>
                                    聚合IDC
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="lg:col-span-6 grid grid-cols-2 gap-8 md:gap-12">
                        <div className="flex flex-col items-center justify-center">
                            <div className="text-center group">
                                <div className="bg-white p-4 rounded-lg shadow-md inline-block transform transition-transform duration-300 group-hover:scale-105">
                                    <img
                                        src="https://image.177911.com/image/qrcode_for_gh_3674cdc88ed6_258.jpg"
                                        alt="企业微信"
                                        className="w-32 h-32 object-cover rounded-lg"
                                    />
                                </div>
                                <p className="mt-4 text-gray-700 font-medium">企业微信</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center">
                            <div className="text-center group">
                                <div className="bg-white p-4 rounded-lg shadow-md inline-block transform transition-transform duration-300 group-hover:scale-105">
                                    <img
                                        src="https://image.177911.com/image/personal-wechat.jpg"
                                        alt="微信客服"
                                        className="w-32 h-32 object-cover rounded-lg"
                                    />
                                </div>
                                <p className="mt-4 text-gray-700 font-medium">微信客服</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="border-t border-gray-200 pt-8">
                    <div className="text-center">
                        <p className="text-gray-600 text-sm">
                            © 2025 知来API. All rights reserved.
                        </p>
                        <p className="text-gray-500 text-xs mt-2">
                            我们尊重客户隐私，不保留聊天记录。国内用户请遵守生成式人工智能服务管理暂行办法。
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default WebFooter;
