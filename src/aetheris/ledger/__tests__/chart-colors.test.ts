import { describe, expect, it } from 'vitest'
import { CHART_COLORS, CATEGORY_COLORS, STAGE_COLORS, compactPipelineStageLabel, stageChartColor } from '../chart-colors'

describe('financial chart identity',()=>{
 it('uses distinct colors for metrics, stage bars, and categories',()=>{
  expect(new Set(Object.values(CHART_COLORS)).size).toBe(6)
  expect(new Set(STAGE_COLORS).size).toBe(6)
  expect(new Set(CATEGORY_COLORS).size).toBe(6)
  expect(stageChartColor(0)).not.toBe(stageChartColor(1))
  expect(stageChartColor(6)).toBe(stageChartColor(0))
 })
 it('compacts only axis labels',()=>{
  expect(compactPipelineStageLabel('Qualification')).toBe('Qualify')
  expect(compactPipelineStageLabel('Negotiation')).toBe('Negotiate')
  expect(compactPipelineStageLabel('Discovery')).toBe('Discovery')
 })
})
