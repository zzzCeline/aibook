// ========================================================
//                     AI书伴 — 用户配置
// ========================================================
// 说明：这是一个面向零基础用户的配置文件。
//       你只需要修改下面这一个地方，其他代码都不需要动。
// ========================================================

// ========== 1. DeepSeek API Key =========================
// 在这里填入你的 DeepSeek API Key
// 获取地址：https://platform.deepseek.com/api_keys
// 注意：Key 以 "sk-" 开头，请确保复制完整
// 示例：sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
const DEEPSEEK_API_KEY = 'sk-332b6a2b993e414e8fb37977cfce221b';
// ========================================================

// ========== 2. 高级设置（一般不需要改）==================
const CONFIG = {
    // CORS 代理地址（因为浏览器不能直接调用AI API，需要中转）
    // 如果这个代理失效，备选：https://api.allorigins.win/raw?url=
    corsProxy: 'https://corsproxy.io/?',

    // API 地址（DeepSeek 官方接口）
    apiUrl: 'https://api.deepseek.com/chat/completions',

    // 使用的模型
    model: 'deepseek-chat',

    // AI 回复的最大长度（数字越大回复越长，但消耗也越多）
    maxTokens: 1000,

    // AI 创造性（0-2，越大越有创意，越小越严谨）
    temperature: 0.8,
};
// ========================================================

// 不要修改下面这行，程序需要用到
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEEPSEEK_API_KEY, CONFIG };
}
