# subagent-effort

English | [中文](#中文)

Claude Code's `Agent` tool takes a `model` for each subagent but no reasoning effort, so every subagent runs at the main session's effort unless its definition file sets one. This mod lets you choose both, per subagent, in plain words.

## Usage

Tell Claude what you want, for example:

> Explore the code with sonnet high, and plan with opus max.

Claude fills the `Agent` call's `model` and starts its `prompt` with a line such as `[effort:high]`. The mod removes that line before the subagent reads its prompt, and sends every model request of that subagent at that effort. Say no level and the subagent keeps the effort it would have had anyway.

Each spawn leaves a dim line in the transcript (Claude does not read it) with the model and effort in force:

```
Subagent Explore → claude-sonnet-5-5 · high
Subagent Plan → claude-opus-5-5 · max
```

Levels: `low`, `medium`, `high`, `xhigh`, `max`; which ones apply depends on the model. Models: the `Agent` tool accepts `sonnet`, `opus`, `haiku` and `fable`.

What wins, highest first: what you say > the subagent's definition file > the main session.

## Tested

On Claude Code 2.1.287, with the main session on opus at `xhigh`, each request's model and effort recorded where the mod hands it on:

| Subagent | Asked for | Model | Effort |
| --- | --- | --- | --- |
| `general-purpose`, `Explore`, `Plan` (built in) | sonnet, low / medium / high | sonnet ✓ | as asked ✓ |
| `claude-code-guide` (built in, interactive sessions) | sonnet, low | sonnet ✓ | low ✓ |
| `fork` (built in, interactive sessions) | sonnet, medium | **opus**, see below | medium ✓ |
| Project agent whose file sets opus + low | sonnet, high | sonnet ✓ | high ✓ |
| The same, nothing asked | — | opus | low, from its file ✓ |
| Personal agent whose file sets medium | sonnet, low | sonnet ✓ | low ✓ |

A subagent that makes several requests (reads a file, then answers) has every request sent at the chosen effort.

## Limits

- A `fork` subagent always runs on the main session's model; Claude Code ignores `model` for forks. Its effort can still be set.
- The effort is applied where Claude Code sends the request; the mod cannot read back what the API received.
- Don't judge a subagent's effort by the `CLAUDE_EFFORT` variable its shell sees: in testing it did not match the effort its requests were sent at.
- If the mod reloads while a subagent is running, that subagent's remaining requests go back to the effort it would have had.
- Installed into a session that is already open, the mod works at once, but Claude learns the `[effort:<level>]` convention from the `Agent` tool's description only in a new session.

---

## 中文

Claude Code 的 `Agent` 工具能给每个子代理指定模型，却不能指定思考等级。子代理的定义文件里没写的话，它就跟主会话用同一档。这个模组让你用一句话为每个子代理分别指定模型和思考等级。

### 用法

直接对 Claude 说，比如：

> 调查代码用 sonnet high，Plan 用 opus max。

Claude 会在 `Agent` 调用里填好 `model`，并在 `prompt` 第一行写一个标记，比如 `[effort:high]`。模组在子代理读到任务之前去掉这一行，并让这个子代理之后每一次请求模型都用这个档位。不说档位，子代理就保持它原本的档位。

每派一个子代理，对话记录里会留一行灰字（Claude 看不到），写明实际生效的模型和档位：

```
Subagent Explore → claude-sonnet-5-5 · high
Subagent Plan → claude-opus-5-5 · max
```

档位可选 `low`、`medium`、`high`、`xhigh`、`max`，具体哪些可用取决于模型。模型可选 `sonnet`、`opus`、`haiku`、`fable`。

优先级从高到低：你在对话里说的 > 子代理定义文件里写的 > 主会话的档位。

### 实测

Claude Code 2.1.287，主会话 opus + `xhigh`，在模组交出请求的位置记录每次请求的模型和档位：

| 子代理 | 指定 | 模型 | 档位 |
| --- | --- | --- | --- |
| `general-purpose`、`Explore`、`Plan`（内置） | sonnet，low / medium / high | sonnet ✓ | 按指定 ✓ |
| `claude-code-guide`（内置，仅交互式会话） | sonnet，low | sonnet ✓ | low ✓ |
| `fork`（内置，仅交互式会话） | sonnet，medium | **opus**，见下方限制 | medium ✓ |
| 项目级子代理，定义里写 opus + low | sonnet，high | sonnet ✓ | high ✓ |
| 同上，不指定 | — | opus | low，来自定义 ✓ |
| 个人级子代理，定义里写 medium | sonnet，low | sonnet ✓ | low ✓ |

子代理发出多次请求（先读文件再回答）时，每一次都按指定档位发送。

### 限制

- `fork` 子代理永远用主会话的模型，Claude Code 对它忽略 `model` 参数；思考等级仍然可以指定
- 档位是在 Claude Code 发出请求的位置改写的，模组无法回读服务端实际收到的值
- 别在子代理里靠环境变量 `CLAUDE_EFFORT` 判断档位：实测它和请求实际用的档位对不上
- 模组在子代理运行途中重新加载的话，这个子代理剩下的请求回到它原本的档位
- 在已打开的会话里安装时，模组立即生效，但 Claude 要到新会话才会从 `Agent` 工具说明里学到 `[effort:<档位>]` 这个约定
