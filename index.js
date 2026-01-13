import dotenv from "dotenv";
import { getTodayCommits, formatCommitsForAI } from "./lib/gitlab.js";
import { generateDailyReport } from "./lib/ai.js";
import { sendToDingTalk, printDailyReport } from "./lib/dingtalk.js";

// 加载环境变量
dotenv.config();

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
      console.log("🔍 模拟运行模式 (不会发送到钉钉)\n");
      printDailyReport(reportContent, process.env);
    } else {
      // 直接发送日报内容
      await sendToDingTalk(reportContent, process.env);
    }

    console.log("🎉 任务执行完成!\n");
  } catch (error) {
    console.error("\n❌ 任务执行失败:", error.message);
    console.error("请检查配置和网络连接\n");
    process.exit(1);
  }
}

// 运行主函数
main();
