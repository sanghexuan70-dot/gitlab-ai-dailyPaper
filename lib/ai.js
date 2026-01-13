import axios from "axios";

// AI 服务配置
const AI_CONFIGS = {
  openai: {
    defaultModel: "gpt-3.5-turbo",
    requestFormat: "openai", // 标准格式
  },
  qianwen: {
    defaultModel: "qwen-turbo",
    requestFormat: "qianwen", // 千问特殊格式
  },
  zhipu: {
    defaultModel: "glm-4",
    requestFormat: "openai", // 兼容 OpenAI 格式
  },
  deepseek: {
    defaultModel: "deepseek-chat",
    requestFormat: "openai", // 兼容 OpenAI 格式
  },
};

/**
 * 调用 AI 接口生成日报
 * @param {string} prompt - AI prompt
 * @param {Object} config - 配置对象
 * @returns {string} 生成的日报文本
 */
export async function generateDailyReport(prompt, config) {
  const { AI_PROVIDER, AI_API_KEY, AI_API_URL, AI_MODEL } = config;

  console.log(`正在使用 ${AI_PROVIDER} 生成日报...`);

  const aiConfig = AI_CONFIGS[AI_PROVIDER];
  if (!aiConfig) {
    throw new Error(`不支持的 AI_PROVIDER: ${AI_PROVIDER}`);
  }

  try {
    const messages = [
      {
        role: "system",
        content:
          "你是一个专业的技术日报助手,擅长将代码提交记录转化为简洁的工作日报。",
      },
      {
        role: "user",
        content: prompt,
      },
    ];

    const requestBody = buildRequestBody(
      aiConfig.requestFormat,
      AI_MODEL || aiConfig.defaultModel,
      messages
    );

    const response = await axios.post(AI_API_URL, requestBody, {
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    return extractResponseContent(aiConfig.requestFormat, response.data);
  } catch (error) {
    console.error("AI 生成日报失败:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * 构建请求体
 * @param {string} format - 请求格式
 * @param {string} model - 模型名称
 * @param {Array} messages - 消息列表
 * @returns {Object} 请求体
 */
function buildRequestBody(format, model, messages) {
  const baseConfig = {
    messages,
    temperature: 0.7,
  };

  if (format === "qianwen") {
    return {
      model,
      input: { messages },
    };
  }

  return {
    ...baseConfig,
    model,
    max_tokens: 500,
  };
}

/**
 * 从响应中提取内容
 * @param {string} format - 响应格式
 * @param {Object} data - 响应数据
 * @returns {string} 提取的内容
 */
function extractResponseContent(format, data) {
  if (format === "qianwen") {
    return data.output.text;
  }

  return data.choices[0].message.content;
}
