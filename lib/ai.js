import axios from 'axios';

/**
 * 调用 AI 接口生成日报
 * @param {string} prompt - AI prompt
 * @param {Object} config - 配置对象
 * @returns {string} 生成的日报文本
 */
export async function generateDailyReport(prompt, config) {
  const {
    AI_PROVIDER,
    AI_API_KEY,
    AI_API_URL,
    AI_MODEL
  } = config;

  console.log(`🤖 正在使用 ${AI_PROVIDER} 生成日报...`);

  try {
    let response;

    switch (AI_PROVIDER) {
      case 'openai':
        response = await callOpenAI(prompt, config);
        break;

      case 'qianwen':
        response = await callQianwen(prompt, config);
        break;

      case 'zhipu':
        response = await callZhipu(prompt, config);
        break;

      case 'deepseek':
        response = await callDeepSeek(prompt, config);
        break;

      default:
        throw new Error(`不支持的 AI_PROVIDER: ${AI_PROVIDER}`);
    }

    return response;

  } catch (error) {
    console.error('❌ AI 生成日报失败:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * OpenAI 接口调用
 */
async function callOpenAI(prompt, config) {
  const response = await axios.post(
    config.AI_API_URL,
    {
      model: config.AI_MODEL,
      messages: [
        {
          role: 'system',
          content: '你是一个专业的技术日报助手,擅长将代码提交记录转化为简洁的工作日报。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    },
    {
      headers: {
        'Authorization': `Bearer ${config.AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * 阿里通义千问接口调用
 */
async function callQianwen(prompt, config) {
  const response = await axios.post(
    config.AI_API_URL,
    {
      model: config.AI_MODEL || 'qwen-turbo',
      input: {
        messages: [
          {
            role: 'system',
            content: '你是一个专业的技术日报助手,擅长将代码提交记录转化为简洁的工作日报。'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${config.AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.output.text;
}

/**
 * 智谱 AI 接口调用
 */
async function callZhipu(prompt, config) {
  const response = await axios.post(
    config.AI_API_URL,
    {
      model: config.AI_MODEL || 'glm-4',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的技术日报助手,擅长将代码提交记录转化为简洁的工作日报。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${config.AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * DeepSeek 接口调用
 */
async function callDeepSeek(prompt, config) {
  const response = await axios.post(
    config.AI_API_URL,
    {
      model: config.AI_MODEL || 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的技术日报助手,擅长将代码提交记录转化为简洁的工作日报。'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    },
    {
      headers: {
        'Authorization': `Bearer ${config.AI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0].message.content;
}
