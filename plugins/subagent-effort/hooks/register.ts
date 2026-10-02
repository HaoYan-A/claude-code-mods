import type { ModelEffort, Register } from 'claude-code'

// 任务第一行的档位标记，例如 [effort:high]
const TAG = /^\s*\[effort:(low|medium|high|xhigh|max)\][ \t]*\r?\n?/

// 追加到 Agent 工具说明末尾，告诉主会话这个约定
const USAGE =
  '\n\nReasoning effort: to run this agent at a specific effort, make the first line of `prompt` ' +
  '`[effort:<level>]`, where level is low, medium, high, xhigh or max. The line is removed before ' +
  "the agent reads its prompt. Without it the agent inherits the session's effort."

// 子代理编号 → 指定档位；模组重新加载后清空，届时还在跑的子代理回到继承主会话
const effortOf = new Map<string, ModelEffort>()

export const register: Register = on => {
  // 模组在会话中途加载时，Agent 工具说明已被缓存，需要重新生成才能带上约定
  on('session.start', async ($, e, next) => {
    $.ui.invalidate('tool.describe')
    return next(e)
  })

  on('tool.describe', { tool: 'Agent' }, async ($, e, next) => {
    const r = await next(e)
    return { ...r, description: r.description + USAGE }
  })

  on('agent.spawn', async ($, e, next) => {
    const m = TAG.exec(e.prompt)
    const effort = m?.[1] as ModelEffort | undefined
    const r = await next(m ? { ...e, prompt: e.prompt.slice(m[0].length) } : e)
    if (r.deny !== undefined || !r.agentId) return r
    if (effort) effortOf.set(r.agentId, effort)
    // 记一行灰字到对话记录（模型看不到）；弹出提示两秒内只留一条，并行派多个会丢
    $.ui.log(`Subagent ${e.subagentType} → ${r.model} · ${effort ?? 'effort inherited'}`)
    return r
  })

  // 子代理每次向模型发请求都经过这里；没打标记的子代理和主会话原样放行
  on('turn.step', async function* ($, e, next) {
    const effort = e.agentId ? effortOf.get(e.agentId) : undefined
    return yield* next(effort ? { ...e, effort } : e)
  })
}
