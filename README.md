# claude-code-mods

English | [中文](#中文)

My collection of [Claude Code mods](https://code.claude.com/docs/en/plugins/mods/overview): plugins made of function hooks that run inside Claude Code and change how it behaves. The repository is a plugin marketplace, so every mod installs with two commands.

Requires Claude Code **v2.1.287** or later (`claude --version`).

## Install

```bash
claude plugin marketplace add HaoYan-A/claude-code-mods
claude plugin install subagent-effort@claude-code-mods
```

A mod installed from the shell loads in the next session; in a session that is already open, run `/reload-plugins`.

Update to the latest version:

```bash
claude plugin marketplace update claude-code-mods
```

## Mods

| Mod | What it does |
| --- | --- |
| [subagent-effort](plugins/subagent-effort) | Pick each subagent's model and reasoning effort in plain words: "explore with sonnet high, plan with opus max" |

## Before you install

A mod is code that runs with your permissions, outside any sandbox. To see which events a mod hooks and which calls it makes, without running it:

```bash
claude plugin validate ./plugins/<mod>
```

## Adding a mod

1. Put it under `plugins/<name>/`: `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.ts`, and tests under `tests/`
2. Add an entry to `.claude-plugin/marketplace.json`, with the same `name` as its `plugin.json`
3. Check it: `claude plugin validate .` and `claude plugin test plugins/<name>`

To work on a mod with hot reload, load its folder directly: `claude --plugin-dir plugins/<name>`.

---

## 中文

我自己的 [Claude Code 模组](https://code.claude.com/docs/en/plugins/mods/overview)合集。模组是在 Claude Code 内部运行的插件，由事件处理函数组成，能改变 Claude Code 的行为。这个仓库本身就是一个插件市场，每个模组两条命令就能装上。

需要 Claude Code **v2.1.287** 或更高版本（用 `claude --version` 查看）。

### 安装

```bash
claude plugin marketplace add HaoYan-A/claude-code-mods
claude plugin install subagent-effort@claude-code-mods
```

在命令行安装后，下一个会话生效；已经打开的会话里执行 `/reload-plugins` 即可加载。

更新到最新版：

```bash
claude plugin marketplace update claude-code-mods
```

### 模组列表

| 模组 | 作用 |
| --- | --- |
| [subagent-effort](plugins/subagent-effort) | 用一句话指定每个子代理的模型和思考等级，比如「调查代码用 sonnet high，Plan 用 opus max」 |

### 安装前须知

模组以你本人的权限运行，没有沙箱隔离。不运行就能查看一个模组挂了哪些事件、调用了哪些能力：

```bash
claude plugin validate ./plugins/<模组名>
```

### 新增模组

1. 放在 `plugins/<名字>/` 下：`.claude-plugin/plugin.json`、`hooks/hooks.json`、`hooks/register.ts`，测试放 `tests/`
2. 在 `.claude-plugin/marketplace.json` 里登记一条，`name` 与它的 `plugin.json` 保持一致
3. 检查：`claude plugin validate .` 和 `claude plugin test plugins/<名字>`

开发时想改完自动生效，直接加载模组目录：`claude --plugin-dir plugins/<名字>`。
