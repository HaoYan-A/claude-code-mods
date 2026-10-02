import { expect, test } from 'claude-code/testing'
import type { On, TurnStepInput } from 'claude-code'

const SPAWN = {
  tool_use_id: 'toolu_1',
  description: 'look around',
  subagentType: 'Explore',
  provider: { plugin: 'engine', tier: 'core' },
  parentModel: 'claude-opus-5-5',
  background: false,
  fork: false,
} as const

const STEP = { turnId: 't1', index: 0, model: 'claude-sonnet-5-5', effort: 'max', messageCount: 1 } as const

// 引擎侧的替身：记下子代理拿到的任务、每次请求的档位和对话记录里的灰字
function engine(on: On) {
  const seen = { prompts: [] as string[], efforts: [] as TurnStepInput['effort'][], logs: [] as string[] }
  on('agent.spawn', async (_, e) => {
    seen.prompts.push(e.prompt)
    return { model: 'claude-sonnet-5-5', agentId: `a${seen.prompts.length}` }
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

test('a tagged spawn runs every step at that effort and never sees the tag', async ($, on) => {
  const seen = engine(on)
  await $.agent.spawn({ ...SPAWN, prompt: '[effort:high]\nFind the router.' })
  await drain($.turn.step({ ...STEP, agentId: 'a1' }))
  await drain($.turn.step({ ...STEP, index: 1, agentId: 'a1' }))

  expect(seen.prompts).toEqual(['Find the router.'])
  expect(seen.efforts).toEqual(['high', 'high'])
  expect(seen.logs).toEqual(['Subagent Explore → claude-sonnet-5-5 · high'])
})

test('an untagged spawn and the main session keep the session effort', async ($, on) => {
  const seen = engine(on)
  await $.agent.spawn({ ...SPAWN, prompt: 'Find the router.' })
  await drain($.turn.step({ ...STEP, agentId: 'a1' }))
  await drain($.turn.step({ ...STEP, model: 'claude-opus-5-5' }))

  expect(seen.prompts).toEqual(['Find the router.'])
  expect(seen.efforts).toEqual(['max', 'max'])
  expect(seen.logs).toEqual(['Subagent Explore → claude-sonnet-5-5 · effort inherited'])
})

test('each subagent keeps its own effort', async ($, on) => {
  const seen = engine(on)
  await $.agent.spawn({ ...SPAWN, prompt: '[effort:medium]\nFind the router.' })
  await $.agent.spawn({ ...SPAWN, subagentType: 'Plan', prompt: '[effort:max]\nPlan the change.' })
  await drain($.turn.step({ ...STEP, effort: 'high', agentId: 'a2' }))
  await drain($.turn.step({ ...STEP, effort: 'high', agentId: 'a1' }))

  expect(seen.efforts).toEqual(['max', 'medium'])
})

test('the Agent tool description carries the tag convention', async ($, on) => {
  on('tool.describe', async (_, e) => ({ description: e.description }))
  const r = await $.tool.describe({ tool: 'Agent', description: 'Launch a new agent.', provider: SPAWN.provider })

  expect(r.description).toContain('[effort:<level>]')
})
