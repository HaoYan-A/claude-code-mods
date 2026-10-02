import { type Engine, expect, test } from 'claude-code/testing'
import type { On, TurnStepInput } from 'claude-code'

const CORE = { plugin: 'engine', tier: 'core' } as const

const SPAWN = {
  provider: CORE,
  parentModel: 'claude-opus-5-5',
  background: false,
  fork: false,
} as const

const STEP = { turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'max', messageCount: 1 } as const

// 引擎侧的替身：Agent 工具收到调用后启动子代理；记下工具收到的参数、子代理拿到的模型、每次请求的档位和灰字
function engine($: Engine, on: On) {
  const seen = {
    calls: [] as Record<string, unknown>[],
    spawnModels: [] as (string | undefined)[],
    efforts: [] as TurnStepInput['effort'][],
    logs: [] as string[],
  }
  on('tool.call', { tool: 'Agent' }, async (_, e) => {
    seen.calls.push({ ...e })
    await $.agent.spawn({
      ...SPAWN,
      tool_use_id: e.tool_use_id,
      prompt: e.prompt,
      description: e.description,
      subagentType: e.subagent_type ?? 'general-purpose',
      model: e.model,
    })
    // 替身的工具结果，内容与本测试无关
    return { result: {} } as never
  })
  on('agent.spawn', async (_, e) => {
    seen.spawnModels.push(e.model)
    return { model: e.model ?? 'claude-opus-5-5', agentId: `a${seen.spawnModels.length}` }
  })
  on('turn.step', async function* (_, e) {
    seen.efforts.push(e.effort)
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn', usage: null }
  })
  on('ui.log', async (_, e) => {
    seen.logs.push(e.text)
    return { value: undefined }
  })
  return seen
}

async function drain(stream: AsyncIterable<unknown>) {
  for await (const _ of stream) {
  }
}

function agentCall(id: string, extra: Record<string, unknown>) {
  return {
    tool: 'Agent',
    tool_use_id: id,
    description: 'look around',
    prompt: 'Find the router.',
    subagent_type: 'general-purpose',
    ...extra,
  } as never
}

test('a custom model and an effort reach the subagent, past the Agent schema', async ($, on) => {
  const seen = engine($, on)
  await $.tool.call(agentCall('toolu_1', { model: 'gpt-6', effort: 'low' }))
  await drain($.turn.step({ ...STEP, agentId: 'a1' }))
  await drain($.turn.step({ ...STEP, index: 1, agentId: 'a1' }))

  expect(seen.calls[0]).not.toHaveProperty('model')
  expect(seen.calls[0]).not.toHaveProperty('effort')
  expect(seen.spawnModels).toEqual(['gpt-6'])
  expect(seen.efforts).toEqual(['low', 'low'])
  expect(seen.logs).toEqual(['Subagent general-purpose → gpt-6 · low'])
})

test('an alias model is left to the Agent tool, the effort still applies', async ($, on) => {
  const seen = engine($, on)
  await $.tool.call(agentCall('toolu_1', { model: 'sonnet', effort: 'high' }))
  await drain($.turn.step({ ...STEP, agentId: 'a1' }))

  expect(seen.calls[0]?.model).toBe('sonnet')
  expect(seen.calls[0]).not.toHaveProperty('effort')
  expect(seen.spawnModels).toEqual(['sonnet'])
  expect(seen.efforts).toEqual(['high'])
})

test('without model or effort, the subagent and the main session keep their own', async ($, on) => {
  const seen = engine($, on)
  await $.tool.call(agentCall('toolu_1', {}))
  await drain($.turn.step({ ...STEP, agentId: 'a1' }))
  await drain($.turn.step(STEP))

  expect(seen.spawnModels).toEqual([undefined])
  expect(seen.efforts).toEqual(['max', 'max'])
  expect(seen.logs).toEqual(['Subagent general-purpose → claude-opus-5-5 · default effort'])
})

test('each subagent keeps its own model and effort', async ($, on) => {
  const seen = engine($, on)
  await $.tool.call(agentCall('toolu_1', { model: 'grok-4.7', effort: 'medium' }))
  await $.tool.call(agentCall('toolu_2', { model: 'opus', effort: 'max' }))
  await drain($.turn.step({ ...STEP, effort: 'high', agentId: 'a2' }))
  await drain($.turn.step({ ...STEP, effort: 'high', agentId: 'a1' }))

  expect(seen.spawnModels).toEqual(['grok-4.7', 'opus'])
  expect(seen.efforts).toEqual(['max', 'medium'])
})

test('an unknown effort level is refused before anything starts', async ($, on) => {
  const seen = engine($, on)
  const r = await $.tool.call(agentCall('toolu_1', { model: 'gpt-6', effort: 'ultra' }))

  expect(r.deny).toContain('effort must be one of')
  expect(seen.calls).toEqual([])
  expect(seen.spawnModels).toEqual([])
})

test('the Agent tool description carries the convention', async ($, on) => {
  on('tool.describe', async (_, e) => ({ description: e.description }))
  const r = await $.tool.describe({ tool: 'Agent', description: 'Launch a new agent.', provider: CORE })

  expect(r.description).toContain('any model ID your provider serves')
  expect(r.description).toContain('`effort`')
})
