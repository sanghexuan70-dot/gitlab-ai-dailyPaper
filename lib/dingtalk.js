import axios from "axios";
import crypto from "crypto";

/**
 * 发送日报到钉钉群
 * @param {string} content - 日报内容
 * @param {Object} config - 配置对象
 */
export async function sendToDingTalk(content, config) {
  const { DINGTALK_WEBHOOK, DINGTALK_SECRET, REPORT_AUTHOR, REPORT_TEAM } =
    config;

  console.log("📤 正在发送日报到钉钉...");

  try {
    let webhook = DINGTALK_WEBHOOK;

    // 如果配置了加签密钥,需要生成签名
    if (DINGTALK_SECRET) {
      const timestamp = Date.now();
      const sign = generateSignature(timestamp, DINGTALK_SECRET);
      webhook = `${DINGTALK_WEBHOOK}&timestamp=${timestamp}&sign=${encodeURIComponent(
        sign
      )}`;
    }

    // 获取当前日期
    const now = new Date();
    const dateStr = now
      .toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");

    // 构建 Markdown 消息
    const message = {
      msgtype: "markdown",
      markdown: {
        title: "每日工作日报",
        text:
          `### ${dateStr} 工作日报\n\n` +
          `**姓名:** ${REPORT_AUTHOR}\n` +
          `**部门:** ${REPORT_TEAM}\n\n` +
          `---\n\n` +
          `${content}\n\n` +
          `---\n\n` +
          `🤖 本日报由 AI 自动生成`,
      },
    };

    const response = await axios.post(webhook, message);

    if (response.data.errcode === 0) {
      console.log("✅ 日报发送成功!");
    } else {
      console.error("❌ 钉钉返回错误:", response.data);
    }

    return response.data;
  } catch (error) {
    console.error(
      "❌ 发送钉钉消息失败:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * 生成钉钉机器人签名
 * @param {number} timestamp - 时间戳
 * @param {string} secret - 密钥
 * @returns {string} 签名
 */
function generateSignature(timestamp, secret) {
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(stringToSign);
  return hmac.digest("base64");
}

/**
 * 仅打印日报内容(用于测试)
 * @param {string} content - 日报内容
 * @param {Object} config - 配置对象
 */
export function printDailyReport(content, config) {
  const { REPORT_AUTHOR, REPORT_TEAM } = config;

  const now = new Date();
  const dateStr = now
    .toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\//g, "-");

  console.log("\n" + "=".repeat(60));
  console.log(`${dateStr} 工作日报`);
  console.log("=".repeat(60));
  console.log(`姓名: ${REPORT_AUTHOR}`);
  console.log(`部门: ${REPORT_TEAM}`);
  console.log("-".repeat(60));
  console.log(content);
  console.log("-".repeat(60));
  console.log("=".repeat(60) + "\n");
}
