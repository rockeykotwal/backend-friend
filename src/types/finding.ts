export interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low'
  problem: string
  explanation: string
  sql_generated: string
  fixed_query: string
  migration: string | null
  impact_estimate: string
}
