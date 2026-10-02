# subagent-effort

English | [中文](#中文)

Claude Code's `Agent` tool takes a `model` for each subagent, but only the aliases `sonnet`, `opus`, `haiku` and `fable`, and no reasoning effort at all: a subagent runs at the main session's effort unless its definition file sets one. This mod lets every subagent run on any model and at any effort, chosen per call.

## Usage

Tell Claude what you want, for example:

> Explore the code with sonnet at high effort, get a second opinion from gpt-6 at medium, and plan with grok-4.7.

Claude fills two parameters of the `Agent` call:

- `model`: an alias, or **any model ID your provider serves**, such as `gpt-6` or `grok-4.7`
- `effort`: `low`, `medium`, `high`, `xhigh` or `max`, optional

The `Agent` tool would reject a model ID outside its aliases and an `effort` field it does not know. The mod takes both out of the call before the tool checks it, starts the subagent on that model, and sends every model request of that subagent at that effort. Leave either out and the subagent keeps its own (from its definition file, or the main session). An `effort` outside the five levels is refused before anything starts; model IDs are not checked.

Each spawn leaves a dim line in the transcript (Claude does not read it) with the model and effort in force:

```
Subagent general-purpose → gpt-6 · medium
Subagent Plan → grok-4.7 · default effort
```

What wins, highest first: what you say > the subagent's definition file > the main session.

### Models other than Claude

The mod only names the model; it routes nothing. A model ID works when the endpoint Claude Code talks to (`ANTHROPIC_BASE_URL`) serves it through the Anthropic Messages API, as an LLM gateway does. Claude Code prints an `unrecognized_model` notice for such IDs and carries on. A name the endpoint does not serve fails within a second with "It may not exist or you may not have access to it".

## Tested

Claude Code 2.1.287, main session on opus at `xhigh`. Every row was checked on the request Claude Code sent, recorded by a local forwarding proxy in front of the gateway:

| Subagent | Asked for | Request sent |
| --- | --- | --- |
| `general-purpose`, ran a Bash command | gpt-6, low | gpt-6 · low, both requests |
| `Explore` | sonnet, high | claude-sonnet-5-5 · high |
| `Plan` | grok-4.7 | grok-4.7 · xhigh, the session's |
| `general-purpose` | medium | claude-opus-5-5 · medium |
| Project agent whose file sets opus + low | gpt-6, high | gpt-6 · high |
| The same, nothing asked | — | claude-opus-5-5 · low, from its file |
| Personal agent whose file sets medium | grok-4.7, low | grok-4.7 · low |
| `general-purpose` | gpt-6, effort `ultra` | refused, no request sent |

In each run Claude was asked in plain words and picked the parameters from the `Agent` tool's description. The main session's own requests kept `xhigh` throughout.

## Limits

- A `fork` subagent always runs on the main session's model; Claude Code ignores `model` for forks. Its effort can still be set.
- For models other than Claude, Claude Code sends the effort as `output_config.effort`. Whether the gateway maps it to that provider's own setting is up to the gateway.
- Don't judge a subagent's effort by the `CLAUDE_EFFORT` variable its shell sees: in testing it did not match the effort its requests were sent at.
- If the mod reloads while a subagent is running, that subagent's remaining requests go back to its default effort.
- Installed into a session that is already open, the mod works at once, but Claude learns the convention from the `Agent` tool's description only in a new session.

---

## 中文

Claude Code 的 `Agent` 工具可以给每个子代理指定模型，但只认 `sonnet`、`opus`、`haiku`、`fable` 这四个简称；思考等级则完全不能指定，子代理的定义文件里没写的话，就跟主会话用同一档。这个模组让每个子代理都能按次指定任意模型和任意思考等级。

### 用法

直接对 Claude 说，比如：

> 调查代码用 sonnet，思考等级 high；再让 gpt-6 用 medium 给个第二意见；Plan 用 grok-4.7。

Claude 会在 `Agent` 调用里填两个参数：

- `model`：简称，或**你的服务端提供的任意模型名**，比如 `gpt-6`、`grok-4.7`
- `effort`：`low`、`medium`、`high`、`xhigh`、`max` 之一，可不填

`Agent` 工具本身会拒绝简称以外的模型名，也不认识 `effort` 这个参数。模组在工具检查参数之前把这两个取走，用指定模型启动子代理，并让这个子代理之后每一次请求都按指定档位发送。哪个不填，子代理就保持它自己的（来自定义文件或主会话）。`effort` 写成五档以外的值会在启动前被拒绝；模型名不做校验。

每派一个子代理，对话记录里会留一行灰字（Claude 看不到），写明实际生效的模型和档位：

```
Subagent general-purpose → gpt-6 · medium
Subagent Plan → grok-4.7 · default effort
```

优先级从高到低：你在对话里说的 > 子代理定义文件里写的 > 主会话的档位。

#### 用 Claude 以外的模型

模组只负责把模型名填上去，不做任何转发。一个模型名能不能用，取决于 Claude Code 连接的服务端（`ANTHROPIC_BASE_URL`）是否以 Anthropic Messages 接口提供它，例如各类模型网关。对这类模型名 Claude Code 会打印一行 `unrecognized_model` 提示，不影响运行。服务端不认识的名字会在 1 秒内失败，报错为"模型可能不存在或无权访问"。

### 实测

Claude Code 2.1.287，主会话 opus + `xhigh`。每一行都在 Claude Code 实际发出的请求上核对，由网关前面的一个本机转发站记录：

| 子代理 | 指定 | 实际发出的请求 |
| --- | --- | --- |
| `general-purpose`，跑了一次 Bash | gpt-6，low | gpt-6 · low，前后两次请求都是 |
| `Explore` | sonnet，high | claude-sonnet-5-5 · high |
| `Plan` | grok-4.7 | grok-4.7 · xhigh，主会话的档位 |
| `general-purpose` | medium | claude-opus-5-5 · medium |
| 项目级子代理，定义写 opus + low | gpt-6，high | gpt-6 · high |
| 同上，不指定 | — | claude-opus-5-5 · low，来自定义 |
| 个人级子代理，定义写 medium | grok-4.7，low | grok-4.7 · low |
| `general-purpose` | gpt-6，effort 写成 `ultra` | 被拒绝，一条请求都没发 |

每次都是用自然语言告诉 Claude，由它根据 `Agent` 工具说明自己填参数。主会话自己的请求始终保持 `xhigh`。

### 限制

- `fork` 子代理永远用主会话的模型，Claude Code 对它忽略 `model`；思考等级仍然可以指定
- 对 Claude 以外的模型，Claude Code 以 `output_config.effort` 字段发送档位，网关是否把它翻译成对应厂商自己的参数，取决于网关
- 别在子代理里靠环境变量 `CLAUDE_EFFORT` 判断档位：实测它和请求实际用的档位对不上
- 模组在子代理运行途中重新加载的话，这个子代理剩下的请求回到默认档位
- 在已打开的会话里安装时，模组立即生效，但 Claude 要到新会话才会从 `Agent` 工具说明里学到这个约定
