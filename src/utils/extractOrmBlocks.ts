const SKIP_PATTERNS = [
  /\.(test|spec)\.(ts|tsx|js|jsx)$/,
  /\.d\.ts$/,
  /\/(migrations?|migrate|seeds?|generated|__generated__|fixtures)\//i,
  /\.(migration|seed|generated|fixture)\./i,
]

const ORM_PATTERNS = [
  // Prisma — findMany, findFirst, findUnique, create, update, upsert, delete, aggregate, $queryRaw
  /\.(findMany|findFirst|findUnique|findUniqueOrThrow|findFirstOrThrow|create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany|aggregate|groupBy|count|\$queryRaw|\$executeRaw|\$transaction)\s*\(/,

  // TypeORM — repository methods, query builder, entity manager
  /\.(findOne|findBy|findOneBy|findAndCount|findAndCountBy|findOneOrFail|save|insert|update|delete|remove|softDelete|restore|recover|count|sum|average|minimum|maximum|increment|decrement|createQueryBuilder|getRepository|getManager|getConnection)\s*\(/,

  // Sequelize — model static methods
  /\.(findAll|findOne|findByPk|findOrCreate|findOrBuild|findAndCountAll|findCreateFind|bulkCreate|upsert|create|update|destroy|restore|count|sum|max|min|increment|decrement)\s*\(/,

  // Drizzle — db.select / insert / update / delete / query / transaction
  /\bdb\.(select|insert|update|delete|query|transaction|execute|run|get|all)\b/,
  /\.(selectFrom|insertInto|updateTable|deleteFrom)\s*\(/,

  // MikroORM — entity manager
  /\bem\.(find|findOne|findOneOrFail|findAndCount|findAll|persist|flush|remove|nativeInsert|nativeUpdate|nativeDelete|count|aggregate|createQueryBuilder)\s*\(/,
  /\bqb\.(select|where|andWhere|orWhere|leftJoin|innerJoin|groupBy|orderBy|limit|offset|getResult|getSingleResult|getCount|execute)\s*\(/,

  // Mongoose — model queries and chainable methods
  /\.(find|findOne|findById|findByIdAndUpdate|findByIdAndDelete|findByIdAndRemove|findOneAndUpdate|findOneAndDelete|findOneAndReplace|findOneAndRemove)\s*\(/,
  /\.(insertMany|create|updateOne|updateMany|replaceOne|deleteOne|deleteMany|bulkWrite|aggregate|countDocuments|estimatedDocumentCount|distinct|populate)\s*\(/,

  // Knex — query builder
  /\bknex\s*\(|\.knex\s*\(/,
  /\.(table|from|join|leftJoin|leftOuterJoin|rightJoin|innerJoin|crossJoin|whereIn|whereNotIn|whereNull|whereNotNull|whereBetween|whereExists)\s*\(/,

  // Kysely — type-safe query builder
  /\.(selectFrom|insertInto|updateTable|deleteFrom|selectAll|executeTakeFirst|executeTakeFirstOrThrow|execute)\s*\(/,

  // Objection.js — built on Knex
  /Model\.query\s*\(|\.query\s*\(\s*trx|\.withGraphFetched\s*\(|\.withGraphJoined\s*\(|\.joinRelated\s*\(|\.insertGraph\s*\(|\.upsertGraph\s*\(/,

  // Waterline (Sails.js)
  /\.(find|findOne|create|createEach|update|updateOne|destroy|destroyOne|count|sum|avg)\s*\(\s*\{/,

  // Bookshelf
  /new\s+\w+Model\s*\(\)|\.forge\s*\(|\.fetchAll\s*\(|\.fetch\s*\(|\.save\s*\(|\.destroy\s*\(/,

  // Generic — raw SQL via tagged templates or query methods
  /\$\{.*?(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)/i,
  /`\s*(SELECT|INSERT|UPDATE|DELETE)\s+/i,
]

export const SUPPORTED_ORMS = [
  'Prisma',
  'TypeORM',
  'Sequelize',
  'Drizzle',
  'MikroORM',
  'Mongoose',
  'Knex',
  'Kysely',
  'Objection.js',
  'Waterline',
  'Bookshelf',
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
