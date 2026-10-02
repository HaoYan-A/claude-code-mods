import type { ModelEffort, Register } from 'claude-code'

// Agent 工具的 model 参数原生只收这几个简称；其他模型名由模组在格式检查前取走，启动子代理时再换上
const ALIASES = new Set(['sonnet', 'opus', 'haiku', 'fable'])
const EFFORTS = new Set(['low', 'medium', 'high', 'xhigh', 'max'])

// 追加到 Agent 工具说明末尾，告诉主会话这两个参数的用法
const USAGE =
  '\n\nAny model, any reasoning effort: `model` also takes any model ID your provider serves ' +
  '(for example `gpt-6` or `grok-4.7`), not only the aliases above. An optional `effort` ' +
  'parameter (low, medium, high, xhigh or max) sets this agent\'s reasoning effort for every ' +
  "request it makes. Without `effort` the agent keeps its default effort: its definition's, else the session's."

// Agent 调用编号 → 调用里指定的自定义模型与档位，只在这次调用启动子代理的过程中有效
const asked = new Map<string, { model?: string; effort?: ModelEffort }>()
// 子代理编号 → 指定档位；模组重新加载后清空，届时还在跑的子代理回到默认档位
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

  // 在 Agent 工具检查参数格式之前取走自定义模型名和 effort，否则会被当成非法参数拒绝
  on('tool.call', { tool: 'Agent' }, async ($, e, next) => {
    const { model, effort, ...rest } = e as typeof e & { model?: string; effort?: string }
    const custom = model !== undefined && !ALIASES.has(model)
    if (!custom && effort === undefined) return next(e)
    if (effort !== undefined && !EFFORTS.has(effort)) {
      return { deny: `effort must be one of low, medium, high, xhigh, max; got "${effort}"` }
    }
    asked.set(e.tool_use_id, { model: custom ? model : undefined, effort: effort as ModelEffort | undefined })
    try {
      return await next((custom ? rest : { ...rest, model }) as typeof e)
    } finally {
      asked.delete(e.tool_use_id)
    }
  })

  on('agent.spawn', async ($, e, next) => {
    const a = asked.get(e.tool_use_id)
    const r = await next(a?.model ? { ...e, model: a.model } : e)
    if (r.deny !== undefined || !r.agentId) return r
    if (a?.effort) effortOf.set(r.agentId, a.effort)
    // 记一行灰字到对话记录（模型看不到）；弹出提示两秒内只留一条，并行派多个会丢
    $.ui.log(`Subagent ${e.subagentType} → ${r.model} · ${a?.effort ?? 'default effort'}`)
    return r
  })

  // 子代理每次向模型发请求都经过这里；没指定档位的子代理和主会话原样放行
  on('turn.step', async function* ($, e, next) {
    const effort = e.agentId ? effortOf.get(e.agentId) : undefined
    return yield* next(effort ? { ...e, effort } : e)
  })
}
