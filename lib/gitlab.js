import axios from "axios";

/**
 * 获取 GitLab 指定日期的提交记录
 * @param {Object} config - 配置对象
 * @param {string} date - 日期 YYYY-MM-DD
 * @returns {Array} 提交记录列表
 */
export async function getTodayCommits(config, date = new Date()) {
  const {
    GITLAB_URL,
    GITLAB_TOKEN,
    GITLAB_PROJECT_IDS,
    GITLAB_AUTHOR_USERNAME,
  } = config;

  const projectIds = GITLAB_PROJECT_IDS.split(",").map((id) => id.trim());
  const allCommits = [];

  // 转换时区,获取当天的起止时间
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const since = startDate.toISOString();
  const until = endDate.toISOString();

  console.log(`正在获取 ${date.toLocaleDateString("zh-CN")} 的提交记录...`);
  console.log(`时间范围: ${since} ~ ${until}`);
  console.log(`过滤用户: ${GITLAB_AUTHOR_USERNAME}`);

  // 获取当前用户的真实邮箱和名称
  let userEmail = "";
  let userName = "";
  try {
    const userResponse = await axios({
      method: "get",
      url: `${GITLAB_URL}/api/v4/user`,
      headers: {
        "PRIVATE-TOKEN": GITLAB_TOKEN,
      },
    });
    userEmail = userResponse.data.email.toLowerCase();
    userName = userResponse.data.name.toLowerCase();
    console.log(`✅ 获取到用户信息: ${userName} (${userEmail})`);
  } catch (error) {
    console.warn("无法获取用户信息,将使用用户名匹配");
  }

  for (const projectId of projectIds) {
    try {
      // 先获取项目信息
      let projectName = `项目 ${projectId}`;
      try {
        const projectResponse = await axios({
          method: "get",
          url: `${GITLAB_URL}/api/v4/projects/${projectId}`,
          headers: {
            "PRIVATE-TOKEN": GITLAB_TOKEN,
          },
        });
        projectName = projectResponse.data.name;
      } catch (projectError) {
        console.warn(`无法获取项目 ${projectId} 的名称,使用默认名称`);
      }

      const response = await axios({
        method: "get",
        url: `${GITLAB_URL}/api/v4/projects/${projectId}/repository/commits`,
        headers: {
          "PRIVATE-TOKEN": GITLAB_TOKEN,
        },
        params: {
          since,
          until,
          per_page: 100,
        },
      });

      const commits = response.data;

      // 手动过滤: 只保留当前用户的提交
      // 使用获取到的用户邮箱和名称进行精确匹配
      // 排出合并请求
      const userCommits = commits.filter((commit) => {
        const commitEmail = commit.author_email?.toLowerCase() || "";
        const commitName = commit.author_name?.toLowerCase() || "";

        // 精确匹配邮箱或名称
        const emailMatch = userEmail ? commitEmail === userEmail : false;
        const nameMatch = userName ? commitName === userName : false;
        const usernameMatch = commitName.includes(
          GITLAB_AUTHOR_USERNAME.toLowerCase()
        );

        // 排除合并提交
        const isMergeCommit = /^Merge branch '.+' into '.+'/.test(
          commit.message
        );

        return (emailMatch || nameMatch || usernameMatch) && !isMergeCommit;
      });

      console.log(
        `${projectName}: 总共 ${commits.length} 条提交,过滤后 ${userCommits.length} 条`
      );

      allCommits.push(
        ...userCommits.map((commit) => ({
          projectId,
          projectName,
          title: commit.title,
          message: commit.message,
          createdAt: commit.created_at,
          shortId: commit.short_id,
          url: commit.web_url,
        }))
      );
    } catch (error) {
      console.error(
        `获取项目 ${projectId} 提交失败:`,
        error.response?.data || error.message
      );
    }
  }

  return allCommits;
}

/**
 * 判断是否为纯粹的合并分支提交(无实际内容)
 * @param {string} title - 提交标题
 * @returns {boolean} 是否为无意义的合并提交
 */
function isPureMergeCommit(title) {
  // 匹配纯粹的合并分支语句,没有其他有意义的内容
  return /^(Merge branch|Merge remote-tracking|Merge pull request)\s+\S+\s+into\s+\S+$/i.test(
    title
  );
}

/**
 * 格式化提交记录为 AI prompt
 * @param {Array} commits - 提交记录
 * @returns {string} AI prompt 文本
 */
export function formatCommitsForAI(commits) {
  // 过滤掉纯粹的合并分支提交,但保留有实际内容的提交
  const filteredCommits = commits.filter(
    (commit) => !isPureMergeCommit(commit.title)
  );

  if (filteredCommits.length === 0) {
    return '今天没有有效的 GitLab 提交记录。请直接返回"今日工作内容：暂无数据"';
  }

  // 按项目分组
  const groupedByProject = filteredCommits.reduce((acc, commit) => {
    const key = commit.projectId;
    if (!acc[key]) {
      acc[key] = {
        projectName: commit.projectName,
        commits: [],
      };
    }
    acc[key].commits.push(commit);
    return acc;
  }, {});

  // 对每个项目内的提交按时间排序
  Object.values(groupedByProject).forEach((project) => {
    project.commits.sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
  });

  // 按项目名称排序
  const sortedProjects = Object.entries(groupedByProject).sort(([, a], [, b]) =>
    a.projectName.localeCompare(b.projectName, "zh-CN")
  );

  let text =
    "以下是我今天在 GitLab 的提交记录,请帮我生成一份工作日报(中文):\n\n";

  // 添加提交前缀说明
  text += "提交前缀说明:\n";
  text += "- feat: 新增功能\n";
  text += "- fix: 修复错误\n";
  text += "- style: 代码样式修改,不影响逻辑\n";
  text += "- refactor: 代码重构,优化结构但不改变功能\n";
  text += "- build: 构建系统或依赖项变更\n";
  text += "- revert: 回滚之前的提交\n";
  text += "- perf: 性能优化\n";
  text += "- test: 测试相关\n";
  text += "- docs: 文档更新\n";
  text += "- chore: 构建/工具链相关\n\n";

  sortedProjects.forEach(([, projectData]) => {
    text += `#### ${projectData.projectName}\n\n`;
    projectData.commits.forEach((commit, index) => {
      text += `${index + 1}. ${commit.title}\n`;
      if (commit.message && commit.message !== commit.title) {
        text += `   ${commit.message.split("\n")[0]}\n`;
      }
    });
    text += "\n";
  });

  text += `要求:\n`;
  text += `- 使用"工作内容"开头\n`;
  text += `- 以项目名称为一级标题\n`;
  text += `- 以项目内的提交记录作为标题下面的工作内容列表，也就是二级内容\n`;
  text += `- **重要**: 每条提交记录要保留原始内容,只是润色语言表达,不要改写成"合并"、"成功合并"这种通用描述\n`;
  text += `- 直接使用提交标题作为工作内容,根据提交前缀说明理解含义,必要时补充说明让语句更通顺\n`;
  text += `- 偏技术日报风格\n`;
  text += `- 根据提交前缀自动标注: feat→【新增】, fix→【修复】, refactor→【优化】, perf→【优化】, style→【样式】\n`;
  text += `- 总字数控制在 300 字以内\n`;
  text += `- 总体检查一遍看看有无重复内容或者错误输出，无需输出提交记录总结\n`;

  return text;
}
