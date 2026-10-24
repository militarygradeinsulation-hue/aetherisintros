/** Accessible financial chart colors: never apply global grayscale to these. */
export const CHART_COLORS = {
  billed:'#60A5FA', collected:'#34D399', teal:'#2DD4BF',
  amber:'#F472B6', violet:'#C4B5FD', rose:'#FB7185',
} as const
export const STAGE_COLORS = [CHART_COLORS.billed,CHART_COLORS.teal,CHART_COLORS.amber,
 CHART_COLORS.violet,CHART_COLORS.collected,CHART_COLORS.rose] as const
export const CATEGORY_COLORS = [CHART_COLORS.billed,CHART_COLORS.collected,CHART_COLORS.amber,
 CHART_COLORS.violet,CHART_COLORS.rose,CHART_COLORS.teal] as const
export function stageChartColor(index:number):string {
 return STAGE_COLORS[Math.abs(Math.trunc(index))%STAGE_COLORS.length] || CHART_COLORS.billed
}
export function compactPipelineStageLabel(stage:string):string {
 return stage==='Qualification'?'Qualify':stage==='Negotiation'?'Negotiate':stage
}
