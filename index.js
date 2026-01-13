import dotenv from "dotenv";
import { exec } from "child_process";
import { getTodayCommits, formatCommitsForAI } from "./lib/gitlab.js";
import { generateDailyReport } from "./lib/ai.js";
import { sendToDingTalk, printDailyReport } from "./lib/dingtalk.js";

// 加载环境变量
dotenv.config();

// 钉钉日报创建页面url
const DINGTALK_REPORT_URL =
  "https://report.dingtalk.com/alid/app/reportpc/createreport.html?corpid=dingc0ef3bb242815cd035c2f4657eb6378f&comeFromInside=1&templateId=15dcb324549d958d99832164887913dc&sourcefrom=immsg";

/**
 * 使用系统默认浏览器打开 URL
 * @param {string} url - 要打开的 URL
 */
function openBrowser(url) {
  const platform = process.platform;

  let command;
  if (platform === "darwin") {
    command = `open "${url}"`;
  } else if (platform === "win32") {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.error("打开浏览器失败:", error.message);
    } else {
      console.log("✅ 已自动打开钉钉日报页面");
    }
  });
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");

  console.log("🚀 开始执行自动化日报任务...\n");

  try {
    // 1. 获取 GitLab 提交记录
    const commits = await getTodayCommits(process.env);
    console.log(`✅ 共获取到 ${commits.length} 条提交记录\n`);

    // 2. 格式化为 AI prompt
    const prompt = formatCommitsForAI(commits);
    console.log("📝 AI Prompt 已生成\n");

    // 3. 调用 AI 生成日报
    const reportContent = await generateDailyReport(prompt, process.env);
    console.log("✅ 日报内容已生成\n");

    // 4. 发送或打印日报
    if (isDryRun) {
      console.log("模拟运行模式 (不会发送到钉钉)\n");
      await printDailyReport(reportContent, process.env);
      // 自动打开钉钉日报页面
      console.log("正在打开钉钉日报页面...\n");
      openBrowser(DINGTALK_REPORT_URL);
    } else {
      // 发送日报内容至群聊机器人
      await sendToDingTalk(reportContent, process.env);
      // 自动打开钉钉日报页面
      console.log("正在打开钉钉日报页面...\n");
      openBrowser(DINGTALK_REPORT_URL);
    }

    console.log("🎉 任务执行完成!\n");
  } catch (error) {
    console.error("\n任务执行失败:", error.message);
    console.error("请检查配置和网络连接\n");
    process.exit(1);
  }
}

// 运行主函数
main();
