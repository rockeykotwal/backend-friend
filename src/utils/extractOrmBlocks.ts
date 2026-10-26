const SKIP_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js|jsx)$/,
  /\.d\.ts$/,
  /\/(migrations?|migrate|seeds?|generated|__generated__)\//i,
  /\.(migration|seed|generated)\./i,
]

const ORM_PATTERNS = [
  // Prisma
  /\.(findMany|findFirst|findUnique|findUniqueOrThrow|findFirstOrThrow|create|createMany|update|updateMany|upsert|delete|deleteMany|aggregate|groupBy|count)\s*\(/,
  // TypeORM
  /\.(find|findOne|findBy|findOneBy|findAndCount|findAndCountBy|save|insert|update|delete|remove|createQueryBuilder|getRepository|getManager)\s*\(/,
  // Sequelize
  /\.(findAll|findOne|findByPk|findOrCreate|bulkCreate|upsert|destroy|update|count|sum|max|min)\s*\(/,
  // Drizzle
  /\bdb\.(select|insert|update|delete|query)\b/,
  /\.(leftJoin|innerJoin|rightJoin|fullJoin|where|groupBy|orderBy|limit|offset)\s*\(/,
]

const CONTEXT_LINES = 8

function isOrmLine(line: string): boolean {
  return ORM_PATTERNS.some(p => p.test(line))
}

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(filePath))
}

export interface ExtractedFile {
  path: string
  content: string
  originalLines: number
  extractedLines: number
}

export function extractOrmBlocks(filePath: string, content: string): ExtractedFile | null {
  if (shouldSkip(filePath)) return null

  const lines = content.split('\n')
  const matchedRanges: Array<[number, number]> = []

  lines.forEach((line, i) => {
    if (isOrmLine(line)) {
      const start = Math.max(0, i - CONTEXT_LINES)
      const end = Math.min(lines.length - 1, i + CONTEXT_LINES)
      matchedRanges.push([start, end])
    }
  })

  if (!matchedRanges.length) return null

  // merge overlapping ranges
  const merged: Array<[number, number]> = []
  for (const [start, end] of matchedRanges.sort((a, b) => a[0] - b[0])) {
    const last = merged[merged.length - 1]
    if (last && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end)
    } else {
      merged.push([start, end])
    }
  }

  const blocks = merged.map(([start, end]) => {
    const snippet = lines.slice(start, end + 1).join('\n')
    return `// lines ${start + 1}–${end + 1}\n${snippet}`
  })

  return {
    path: filePath,
    content: blocks.join('\n\n// ---\n\n'),
    originalLines: lines.length,
    extractedLines: merged.reduce((sum, [s, e]) => sum + (e - s + 1), 0),
  }
}
