const SKIP_PATTERNS: RegExp[] = [
  // Node.js — test/spec, type defs, generated
  /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/,
  /\.d\.ts$/,
  /\/(migrations?|migrate|seeds?|generated|__generated__|fixtures)\//i,
  /\.(migration|seed|generated|fixture)\./i,
  // Python — test files, Alembic migrations, bytecode cache
  /\/test_[^/]*\.py$/,
  /\/[^/]*_test\.py$/,
  /\/tests?\/[^/]*\.py$/,
  /\/alembic\/versions\//i,
  /\/__pycache__\//,
  // Go — test files
  /_test\.go$/,
  // Java / Kotlin — test classes, Maven/Gradle test source
  /\w+(Test|Tests|Spec)\.(java|kt)$/,
  /\/src\/test\//,
  // Ruby — RSpec / minitest, Rails migrations
  /_(spec|test)\.rb$/,
  /\/spec\//i,
  /\/db\/migrate\//i,
  // PHP — test files, Laravel migrations
  /(Test|Tests)\.php$/,
  /\/database\/migrations\//i,
  // C# — test files, EF Core migration scaffolding
  /(Tests?|Spec)\.cs$/,
  /\/Migrations\//,
  // Universal
  /\/node_modules\//,
  /\/vendor\//i,
  /\/target\//,
]

// ---------------------------------------------------------------------------
// Node.js (deep) — Prisma, TypeORM, Sequelize, Drizzle, MikroORM, Mongoose,
//                  Knex, Kysely, Objection.js, Waterline, Bookshelf
// ---------------------------------------------------------------------------
const NODEJS_PATTERNS: RegExp[] = [
  /\.(findMany|findFirst|findUnique|findUniqueOrThrow|findFirstOrThrow|create|createMany|createManyAndReturn|update|updateMany|upsert|delete|deleteMany|aggregate|groupBy|count|\$queryRaw|\$executeRaw|\$transaction)\s*\(/,
  /\.(findOne|findBy|findOneBy|findAndCount|findAndCountBy|findOneOrFail|save|insert|update|delete|remove|softDelete|restore|recover|count|sum|average|minimum|maximum|increment|decrement|createQueryBuilder|getRepository|getManager|getConnection)\s*\(/,
  /\.(findAll|findOne|findByPk|findOrCreate|findOrBuild|findAndCountAll|findCreateFind|bulkCreate|upsert|create|update|destroy|restore|count|sum|max|min|increment|decrement)\s*\(/,
  /\bdb\.(select|insert|update|delete|query|transaction|execute|run|get|all)\b/,
  /\.(selectFrom|insertInto|updateTable|deleteFrom)\s*\(/,
  /\bem\.(find|findOne|findOneOrFail|findAndCount|findAll|persist|flush|remove|nativeInsert|nativeUpdate|nativeDelete|count|aggregate|createQueryBuilder)\s*\(/,
  /\bqb\.(select|where|andWhere|orWhere|leftJoin|innerJoin|groupBy|orderBy|limit|offset|getResult|getSingleResult|getCount|execute)\s*\(/,
  /\.(find|findOne|findById|findByIdAndUpdate|findByIdAndDelete|findByIdAndRemove|findOneAndUpdate|findOneAndDelete|findOneAndReplace|findOneAndRemove)\s*\(/,
  /\.(insertMany|create|updateOne|updateMany|replaceOne|deleteOne|deleteMany|bulkWrite|aggregate|countDocuments|estimatedDocumentCount|distinct|populate)\s*\(/,
  /\bknex\s*\(|\.knex\s*\(/,
  /\.(table|from|join|leftJoin|leftOuterJoin|rightJoin|innerJoin|crossJoin|whereIn|whereNotIn|whereNull|whereNotNull|whereBetween|whereExists)\s*\(/,
  /\.(selectAll|executeTakeFirst|executeTakeFirstOrThrow)\s*\(/,
  /Model\.query\s*\(|\.query\s*\(\s*trx|\.withGraphFetched\s*\(|\.withGraphJoined\s*\(|\.joinRelated\s*\(|\.insertGraph\s*\(|\.upsertGraph\s*\(/,
  /\.(find|findOne|create|createEach|update|updateOne|destroy|destroyOne|count|sum|avg)\s*\(\s*\{/,
  /new\s+\w+Model\s*\(\)|\.forge\s*\(|\.fetchAll\s*\(|\.fetch\s*\(|\.save\s*\(|\.destroy\s*\(/,
  /\$\{.*?(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN)/i,
  /`\s*(SELECT|INSERT|UPDATE|DELETE)\s+/i,
]

// ---------------------------------------------------------------------------
// Python (deep) — SQLAlchemy 1.x/2.0, Django ORM, Peewee, Tortoise, SQLModel
// ---------------------------------------------------------------------------
const PYTHON_PATTERNS: RegExp[] = [
  // SQLAlchemy — session operations
  /session\.(query|execute|add|delete|merge|flush|commit)\s*\(/,
  /db\.session\.(query|execute|add|delete|merge|flush|commit)\s*\(/,
  // SQLAlchemy — query chaining (strongest N+1 signals)
  /\.(filter|filter_by|order_by|group_by|having|join|outerjoin|options|limit|offset|distinct|all|first|one|one_or_none|count|scalar|scalars)\s*\(/,
  // SQLAlchemy — eager loading options (critical for N+1 detection)
  /\b(joinedload|subqueryload|selectinload|lazyload|noload|raiseload|contains_eager|load_only|defer)\s*\(/,
  // SQLAlchemy 2.0 + SQLModel
  /\bselect\s*\(\s*\w|session\.exec\s*\(/,
  // Flask-SQLAlchemy shorthand
  /\b\w+\.query\.(filter|filter_by|all|first|get|one|count|order_by|join|outerjoin|options|paginate)\s*\(/,
  // Django ORM — QuerySet API (select_related / prefetch_related = N+1 detectors)
  /\.objects\.(filter|exclude|get|all|create|bulk_create|bulk_update|update|delete|aggregate|annotate|values|values_list|order_by|select_related|prefetch_related|defer|only|count|exists|distinct|raw|using)\s*[(\s]/,
  /\.select_related\s*\(|\.prefetch_related\s*\(/,
  // Peewee
  /\.(select|where|join|switch|prefetch|group_by|having|order_by|get|get_or_none|create|insert|update|delete)\s*\(\s*(?!\))/,
  // Tortoise ORM
  /await\s+\w+\.(all|filter|get|get_or_none|create|bulk_create|update|delete|count|exists|prefetch_related|select_related)\s*\(/,
  // Raw SQL via cursor or connection
  /cursor\.(execute|executemany|fetchall|fetchone)\s*\(/,
  /connection\.(execute|executemany)\s*\(/,
  // SQLAlchemy Core insert/update/delete
  /\binsert\s*\(\s*\w|delete\s*\(\s*\w/,
  // PyMongo + Motor (async) — MongoDB
  /collection\.(find|find_one|insert_one|insert_many|update_one|update_many|replace_one|delete_one|delete_many|aggregate|count_documents|distinct|bulk_write|find_one_and_update|find_one_and_delete)\s*\(/,
  /await\s+\w+\.(find_one|insert_one|update_one|delete_one|aggregate)\s*\(/,
  // MongoEngine — Document query API
  /\.objects\s*\(|\.objects\.(filter|get|first|all|only|exclude|order_by|limit|skip|count|aggregate|delete)\s*[(\s.]/,
]

// ---------------------------------------------------------------------------
// Go (deep) — GORM, sqlx, Ent, bun, database/sql, sqlc
// ---------------------------------------------------------------------------
const GO_PATTERNS: RegExp[] = [
  // GORM — primary query methods
  /\bdb\.(Find|First|Last|Take|Where|Preload|Joins|Model|Create|Save|Updates?|Delete|Count|Raw|Exec|Scan|Group|Order|Limit|Offset|Distinct|Select|Table|Having|Not|Or|Transaction|Begin)\s*\(/,
  // GORM — chained calls (Preload = N+1 detector)
  /\.(Preload|Association|Scopes|WithContext|Session|InnerJoins)\s*\(/,
  // sqlx
  /\bdb\.(Get|Select|NamedExec|NamedQuery|QueryRowx|Queryx|MustExec|Rebind)\s*\(/,
  // database/sql
  /\bdb\.(Query|QueryRow|Exec|Prepare|Begin)\s*\(/,
  /\brows\.(Scan|Next|Close|Err)\s*\(\s*\)|row\.Scan\s*\(/,
  // Ent
  /client\.\w+\.(Query|Create|Update|Delete)\s*\(\s*ctx/,
  /\.(Where|All|First|Only|Count|With\w+|Order|Limit|Offset|Group|Having)\s*\(\s*ctx/,
  // bun
  /db\.(NewSelect|NewInsert|NewUpdate|NewDelete|NewRaw|RunInTx)\s*\(/,
  // sqlc generated code
  /q\.(Get\w+|List\w+|Create\w+|Update\w+|Delete\w+)\s*\(ctx/,
  // mongo-go-driver — MongoDB
  /collection\.(Find|FindOne|InsertOne|InsertMany|UpdateOne|UpdateMany|ReplaceOne|DeleteOne|DeleteMany|Aggregate|CountDocuments|Distinct|BulkWrite|Watch)\s*\(ctx/,
  /cursor\.(Next|Decode|All|Close)\s*\(ctx/,
]

// ---------------------------------------------------------------------------
// Java / Kotlin (basic) — Hibernate/JPA, Spring Data, MyBatis, jOOQ
// ---------------------------------------------------------------------------
const JAVA_PATTERNS: RegExp[] = [
  /\.(findAll|findById|findOne|findBy\w+|saveAll?|deleteAll?|deleteById|count|existsById|existsBy\w+)\s*\(/,
  /em\.(find|persist|merge|remove|createQuery|createNamedQuery|createNativeQuery|refresh|detach|flush)\s*\(/,
  /session\.(get|load|save|update|merge|delete|saveOrUpdate|createQuery|createCriteria|createSQLQuery)\s*\(/,
  /@Query\s*\(|@Select\s*\(|@Insert\s*\(|@Update\s*\(|@Delete\s*\(/,
  /createQuery\s*\("|createNativeQuery\s*\("/,
  /\.setFirstResult\s*\(|\.setMaxResults\s*\(/,
  /dsl\.(selectFrom|select|insertInto|update|deleteFrom)\s*\(/,
  /\.(fetch|fetchOne|fetchInto|fetchMap|fetchGroups)\s*\(/,
]

// ---------------------------------------------------------------------------
// Ruby (basic) — ActiveRecord, Sequel
// ---------------------------------------------------------------------------
const RUBY_PATTERNS: RegExp[] = [
  /\.(all|first|last|find|find_by|find_by_\w+|where|order|group|having|joins|left_joins|includes|eager_load|preload|select|limit|offset|count|sum|average|maximum|minimum|exists\?|pluck|pick|create|create!|build|save|save!|update|update!|destroy|destroy_all|delete|delete_all|first_or_create|find_or_create_by)\s*[(\s.]/,
  /\.includes\s*\(|\.eager_load\s*\(|\.preload\s*\(/,
  /ActiveRecord::Base\.connection\.(execute|select_all|select_one)\s*\(/,
  /\.find_by_sql\s*\(/,
  /DB\s*\[|\.dataset\b/,
]

// ---------------------------------------------------------------------------
// PHP (basic) — Eloquent (Laravel), Doctrine
// ---------------------------------------------------------------------------
const PHP_PATTERNS: RegExp[] = [
  /\b\w+::(all|find|findOrFail|where|whereIn|whereNotIn|with|withCount|join|leftJoin|orderBy|groupBy|having|limit|offset|count|sum|max|min|avg|first|firstOrFail|firstOrCreate|firstOrNew|create|insert|update|updateOrCreate|delete|destroy|chunk|paginate|get)\s*\(/,
  /\->(where|with|withCount|join|leftJoin|orderBy|groupBy|having|limit|offset|get|first|paginate|chunk|count|sum|max|min|avg|load|loadMissing)\s*\(/,
  /DB::(table|select|insert|update|delete|statement|raw|transaction)\s*\(/,
  /\$em->(find|findAll|findBy|findOneBy|persist|remove|flush|createQuery|createNativeQuery|createQueryBuilder)\s*\(/,
  /\$qb->(select|from|where|andWhere|orWhere|join|leftJoin|innerJoin|orderBy|groupBy|having|setMaxResults|setFirstResult|getQuery|getResult|getSingleResult|getOneOrNullResult)\s*\(/,
]

// ---------------------------------------------------------------------------
// C# (basic) — Entity Framework Core, Dapper
// ---------------------------------------------------------------------------
const CSHARP_PATTERNS: RegExp[] = [
  /\.(Where|Select|Include|ThenInclude|FirstOrDefault|FirstOrDefaultAsync|First|FirstAsync|SingleOrDefault|ToList|ToListAsync|Find|FindAsync|Any|AnyAsync|Count|CountAsync|Sum|Max|Min|Average|OrderBy|OrderByDescending|ThenBy|GroupBy|Join|Skip|Take)\s*[(\s<]/,
  /\.(AsNoTracking|AsSplitQuery|FromSqlRaw|FromSqlInterpolated|ExecuteSqlRaw|ExecuteSqlRawAsync)\s*\(/,
  /context\.\w+\.(Where|Include|FirstOrDefault|ToList|Add|Remove|SaveChanges|Find)\s*[(\s]/,
  /connection\.(Query|QueryFirst|QueryFirstOrDefault|QuerySingle|QuerySingleOrDefault|Execute|ExecuteScalar|QueryMultiple)\s*(<|"|@"|\$")/,
  /\bfrom\s+\w+\s+in\s+\w+\s+(where|select|join)\b/,
]

// ---------------------------------------------------------------------------
// Rust (basic) — Diesel, SQLx, SeaORM
// ---------------------------------------------------------------------------
const RUST_PATTERNS: RegExp[] = [
  /diesel::(insert_into|update|delete|select)\s*\(/,
  /schema::\w+::dsl::/,
  /\.(filter|select|order|limit|offset|inner_join|left_join)\s*\(|\.load::<|\.first::<|\.get_result::<|\.execute\s*\(&/,
  /sqlx::query\s*[!(\s]|sqlx::query_as\s*[!(\s]/,
  /\bquery!\s*\(|query_as!\s*\(/,
  /\.(fetch_all|fetch_one|fetch_optional|execute)\s*\(\s*&/,
  /\w+::Entity::find\s*\(\)|Entity::insert\s*\(/,
  /\.(filter|order_by|limit|offset|all|one|count|into_json|into_model|find_related)\s*\(/,
]

// ---------------------------------------------------------------------------
// Language registry
// ---------------------------------------------------------------------------

export interface LanguageGroup {
  language: string
  depth: 'full' | 'roadmap'
  orms: string[]
}

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    language: 'Node.js',
    depth: 'full',
    orms: ['Prisma', 'TypeORM', 'Sequelize', 'Drizzle', 'MikroORM', 'Mongoose', 'MongoDB (native)', 'Knex', 'Kysely', 'Objection.js', 'Waterline', 'Bookshelf'],
  },
  {
    language: 'Python',
    depth: 'full',
    orms: ['SQLAlchemy', 'Django ORM', 'Peewee', 'Tortoise ORM', 'SQLModel', 'PyMongo', 'Motor', 'MongoEngine'],
  },
  {
    language: 'Go',
    depth: 'full',
    orms: ['GORM', 'sqlx', 'Ent', 'bun', 'database/sql', 'sqlc', 'mongo-go-driver'],
  },
  {
    language: 'Java',
    depth: 'roadmap',
    orms: ['Hibernate/JPA', 'Spring Data', 'MyBatis', 'jOOQ'],
  },
  {
    language: 'Ruby',
    depth: 'roadmap',
    orms: ['ActiveRecord', 'Sequel'],
  },
  {
    language: 'PHP',
    depth: 'roadmap',
    orms: ['Eloquent', 'Doctrine'],
  },
  {
    language: 'C#',
    depth: 'roadmap',
    orms: ['Entity Framework Core', 'Dapper'],
  },
  {
    language: 'Rust',
    depth: 'roadmap',
    orms: ['Diesel', 'SQLx', 'SeaORM'],
  },
]

export const SUPPORTED_ORMS = LANGUAGE_GROUPS.flatMap(g => g.orms)

const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  nodejs: NODEJS_PATTERNS,
  python: PYTHON_PATTERNS,
  go:     GO_PATTERNS,
  java:   JAVA_PATTERNS,
  ruby:   RUBY_PATTERNS,
  php:    PHP_PATTERNS,
  csharp: CSHARP_PATTERNS,
  rust:   RUST_PATTERNS,
}

function detectLanguage(filePath: string): string | null {
  if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath)) return 'nodejs'
  if (/\.py$/.test(filePath))                        return 'python'
  if (/\.go$/.test(filePath))                        return 'go'
  if (/\.(java|kt)$/.test(filePath))                 return 'java'
  if (/\.rb$/.test(filePath))                        return 'ruby'
  if (/\.php$/.test(filePath))                       return 'php'
  if (/\.cs$/.test(filePath))                        return 'csharp'
  if (/\.rs$/.test(filePath))                        return 'rust'
  return null
}

function shouldSkip(filePath: string): boolean {
  return SKIP_PATTERNS.some(p => p.test(filePath))
}

function isOrmLine(line: string, lang: string): boolean {
  return (LANGUAGE_PATTERNS[lang] ?? []).some(p => p.test(line))
}

const CONTEXT_LINES = 8

export interface ExtractedFile {
  path: string
  content: string
  originalLines: number
  extractedLines: number
}

export function extractOrmBlocks(filePath: string, content: string): ExtractedFile | null {
  const lang = detectLanguage(filePath)
  if (!lang) return null
  if (shouldSkip(filePath)) return null

  const lines = content.split('\n')
  const matchedRanges: Array<[number, number]> = []

  lines.forEach((line, i) => {
    if (isOrmLine(line, lang)) {
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
