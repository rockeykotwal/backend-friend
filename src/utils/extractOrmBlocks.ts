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
// Java / Kotlin (full) — Hibernate/JPA, Spring Data, MyBatis, jOOQ, JdbcTemplate
// ---------------------------------------------------------------------------
const JAVA_PATTERNS: RegExp[] = [
  // Spring Data JPA — repository methods
  /\.(findAll|findAllById|findById|findOne|findFirst|findTop\d*By\w*|findBy\w+|saveAll|saveAllAndFlush|saveAndFlush|deleteAll|deleteAllById|deleteAllByIdInBatch|deleteById|deleteBy\w+|countBy\w*|existsById|existsBy\w+|getById|getOne|getReferenceById)\s*\(/,
  // Spring Data — sorting/paging
  /\bPageRequest\.(of|ofSize)\s*\(|Sort\.(by|of)\s*\(/,
  /\.(findAll|findBy\w+)\s*\(\s*(pageable|sort|PageRequest)/i,
  // Hibernate EntityManager
  /em\.(find|persist|merge|remove|contains|refresh|detach|flush|clear|lock|createQuery|createNamedQuery|createNativeQuery|createStoredProcedureQuery)\s*\(/,
  // Hibernate Session (older API)
  /session\.(get|load|save|saveOrUpdate|update|merge|delete|persist|evict|flush|clear|createQuery|createCriteria|createSQLQuery|createNativeQuery|byId|byNaturalId)\s*\(/,
  // JPA Criteria API
  /criteriaBuilder\.(createQuery|createCriteriaUpdate|createCriteriaDelete|equal|notEqual|greaterThan|lessThan|like|in|and|or|not|conjunction|disjunction)\s*\(/,
  /criteriaQuery\.(from|select|where|orderBy|groupBy|having|multiselect)\s*\(/,
  /\broot\.(get|join|joinList|joinSet|joinMap|fetch)\s*\(/,
  // JPQL / HQL string queries
  /createQuery\s*\(\s*["'`]|createNamedQuery\s*\(\s*["'`]/,
  /createNativeQuery\s*\(\s*["'`]/,
  // Query parameter binding + pagination
  /\.setParameter\s*\(|\.setFirstResult\s*\(|\.setMaxResults\s*\(|\.setHint\s*\(/,
  /\.getResultList\s*\(\)|\.getSingleResult\s*\(\)|\.executeUpdate\s*\(\)/,
  // MyBatis — annotations + mapper calls
  /@Select\s*\(|@Insert\s*\(|@Update\s*\(|@Delete\s*\(|@Results\s*\(|@Result\s*\(/,
  /\b\w+Mapper\.(select\w+|insert\w+|update\w+|delete\w+|count\w+|find\w+)\s*\(/,
  // jOOQ
  /dsl\.(selectFrom|select|selectDistinct|selectCount|selectZero|insertInto|update|deleteFrom|mergeInto|with|fetchLazy)\s*\(/,
  /\.(from|join|leftJoin|rightJoin|innerJoin|crossJoin|on|using|where|and|or|groupBy|having|orderBy|limit|offset|seek)\s*\(/,
  /\.(fetch|fetchOne|fetchAny|fetchSingle|fetchInto|fetchMap|fetchGroups|fetchSet|fetchArray|fetchOptional|execute|executeInsert|executeUpdate|executeDelete)\s*\(/,
  // Spring JdbcTemplate / NamedParameterJdbcTemplate
  /jdbcTemplate\.(query|queryForObject|queryForList|queryForMap|queryForRowSet|update|batchUpdate|execute)\s*\(/,
  /namedParameterJdbcTemplate\.(query|queryForObject|queryForList|update|batchUpdate)\s*\(/,
  // Kotlin Exposed
  /\bSchemaUtils\.(create|drop)\s*\(|\bTransaction\.(exec)\s*\(/,
  /\.(selectAll|select|insert|update|deleteWhere|insertAndGetId|batchInsert|upsert)\s*\{/,
]

// ---------------------------------------------------------------------------
// Ruby (full) — ActiveRecord, Sequel
// ---------------------------------------------------------------------------
const RUBY_PATTERNS: RegExp[] = [
  // ActiveRecord — primary query interface
  /\.(all|first|first!|last|last!|find|find!|find_by|find_by!|find_by_\w+|where|where\.not|rewhere|order|reorder|group|having|joins|left_joins|left_outer_joins|includes|eager_load|preload|select|distinct|limit|offset|count|sum|average|maximum|minimum|exists\?|any\?|none\?|one\?|many\?|pluck|pick|ids|tally)\s*[(\s.]/,
  // ActiveRecord — write operations
  /\.(create|create!|new|build|save|save!|update|update!|update_all|update_attribute|update_columns|update_column|destroy|destroy_all|delete|delete_all|touch|increment|increment!|decrement|decrement!|toggle|toggle!|upsert|upsert_all|insert|insert!|insert_all|insert_all!)\s*[(\s]/,
  // N+1 detection — eager loading (key signals)
  /\.includes\s*\(|\.eager_load\s*\(|\.preload\s*\(/,
  /\.strict_loading[!(]?/,
  // ActiveRecord — scoping and batching
  /\.(scope|default_scope|unscoped|unscope|reselect|except|merge|none)\s*[(\s]/,
  /\.(find_each|find_in_batches|in_batches)\s*\(/,
  // ActiveRecord — locking
  /\.(lock|with_lock|lock!)\s*[(\s!]/,
  /\.transaction\s*(\{|do)/,
  // Raw SQL via connection
  /ActiveRecord::Base\.connection\.(execute|select_all|select_one|select_value|select_values|insert|update|delete)\s*\(/,
  /\.find_by_sql\s*\(/,
  /\.sanitize_sql|\.sanitize_sql_array/,
  // ActiveRecord — associations and counters
  /\.(has_many|has_one|belongs_to|has_and_belongs_to_many)\s+:/,
  /\.(counter_cache|touch|inverse_of)\s*:/,
  // Sequel — dataset API
  /DB\s*\[|\bDB\.(from|select|insert|update|delete)\s*\(/,
  /\.dataset\b|\.dataset\.(where|select|join|left_join|group|order|limit|offset|all|first|get|count|insert|update|delete)\s*[(\s]/,
  /\.(from|select_all|select_append|exclude|filter|join_table|natural_join|full_join|cross_join|group_and_count|order_append|reverse|paginate)\s*\(/,
  /\.(fetch_rows|each|map|flat_map|to_a|first|last|single_record\?|get|all|insert|update|delete)\s*[(\s{]/,
]

// ---------------------------------------------------------------------------
// PHP (full) — Eloquent (Laravel), Doctrine ORM, raw DB facade
// ---------------------------------------------------------------------------
const PHP_PATTERNS: RegExp[] = [
  // Eloquent — static model calls
  /\b\w+::(all|find|findOrFail|findMany|findOrNew|where|whereIn|whereNotIn|whereNull|whereNotNull|whereBetween|whereHas|whereDoesntHave|with|withCount|withSum|withAvg|withMax|withMin|withExists|has|doesntHave|join|leftJoin|rightJoin|crossJoin|orderBy|orderByDesc|latest|oldest|groupBy|having|limit|take|offset|skip|count|sum|max|min|avg|first|firstOrFail|firstOrCreate|firstOrNew|firstWhere|create|insert|insertOrIgnore|insertGetId|update|updateOrCreate|updateOrInsert|upsert|delete|destroy|forceDelete|restore|chunk|chunkById|cursor|paginate|simplePaginate|cursorPaginate|get|pluck|lists|value|exists|doesntExist|increment|decrement|touch|truncate|lockForUpdate|sharedLock)\s*\(/,
  // Eloquent — instance / query builder chain
  /->(where|orWhere|whereIn|whereNotIn|whereNull|whereNotNull|whereBetween|whereDate|whereColumn|whereHas|orWhereHas|with|withCount|has|doesntHave|join|leftJoin|rightJoin|orderBy|orderByDesc|latest|oldest|groupBy|having|limit|take|offset|skip|get|first|firstOrFail|find|count|sum|max|min|avg|pluck|value|exists|paginate|simplePaginate|cursorPaginate|chunk|chunkById|cursor|lockForUpdate|sharedLock|load|loadMissing|loadCount|loadSum|append)\s*\(/,
  // Eloquent — N+1 signals
  /->with\s*\(|->load\s*\(|->loadMissing\s*\(/,
  // Eloquent — relationships (defined in model, key for N+1 detection)
  /\b(hasMany|hasOne|belongsTo|belongsToMany|hasManyThrough|hasOneThrough|morphMany|morphOne|morphTo)\s*\(/,
  // Laravel DB facade — raw queries
  /DB::(table|select|selectOne|insert|update|delete|statement|affectingStatement|unprepared|raw|transaction|beginTransaction|commit|rollBack)\s*\(/,
  /DB::table\s*\(->/,
  // Doctrine EntityManager
  /\$(?:em|entityManager|this->em|this->entityManager)->(find|findAll|findBy|findOneBy|persist|remove|flush|clear|refresh|contains|detach|merge|createQuery|createNamedQuery|createNativeQuery|createQueryBuilder|getRepository|getReference|getPartialReference)\s*\(/,
  // Doctrine QueryBuilder
  /\$(?:qb|queryBuilder|this->qb)->(select|addSelect|from|leftJoin|innerJoin|join|where|andWhere|orWhere|setParameter|setParameters|orderBy|addOrderBy|groupBy|addGroupBy|having|andHaving|orHaving|setMaxResults|setFirstResult|getQuery|getResult|getSingleResult|getOneOrNullResult|getScalarResult|getSingleScalarResult|execute|getSQL)\s*\(/,
  // Doctrine Repository methods
  /\$(?:repo|repository|this->repo)->(find|findAll|findBy|findOneBy|findAndCount|count|matching|createQueryBuilder)\s*\(/,
]

// ---------------------------------------------------------------------------
// C# (full) — Entity Framework Core, Dapper, raw ADO.NET
// ---------------------------------------------------------------------------
const CSHARP_PATTERNS: RegExp[] = [
  // EF Core — LINQ query operators (sync + async)
  /\.(Where|Select|SelectMany|Include|ThenInclude|FirstOrDefault|FirstOrDefaultAsync|First|FirstAsync|Last|LastOrDefault|LastOrDefaultAsync|Single|SingleOrDefault|SingleOrDefaultAsync|Find|FindAsync|Any|AnyAsync|All|Count|CountAsync|LongCount|LongCountAsync|Sum|SumAsync|Max|MaxAsync|Min|MinAsync|Average|AverageAsync|OrderBy|OrderByDescending|ThenBy|ThenByDescending|GroupBy|GroupJoin|Join|LeftJoin|Skip|SkipWhile|Take|TakeWhile|Distinct|DistinctBy|Union|Intersect|Except|Concat|Reverse|ToList|ToListAsync|ToArray|ToArrayAsync|ToDictionary|ToDictionaryAsync|ToHashSet|ToLookup|AsEnumerable|AsAsyncEnumerable)\s*[(\s<]/,
  // EF Core — tracking / raw SQL / split queries
  /\.(AsNoTracking|AsNoTrackingWithIdentityResolution|AsTracking|AsSplitQuery|AsSingleQuery|TagWith|IgnoreQueryFilters|IgnoreAutoIncludes|FromSqlRaw|FromSqlInterpolated|FromSql|ExecuteSqlRaw|ExecuteSqlRawAsync|ExecuteSqlInterpolated|ExecuteSqlInterpolatedAsync)\s*\(/,
  // EF Core — DbContext / DbSet write operations
  /\b(?:context|_context|this\._?context|ctx|_ctx|db|_db)\.\w+\.(Add|AddAsync|AddRange|AddRangeAsync|Attach|AttachRange|Update|UpdateRange|Remove|RemoveRange|Find|FindAsync|Entry|Where|Include|FirstOrDefault|ToList|Any|Count)\s*[(\s]/,
  /\b(?:context|_context|ctx|_ctx|db|_db)\.(SaveChanges|SaveChangesAsync|Database|Set|Entry|Attach|Add|Update|Remove)\s*[(\s<]/,
  // EF Core — bulk operations (EFCore.BulkExtensions)
  /\.(BulkInsert|BulkUpdate|BulkDelete|BulkMerge|BulkInsertAsync|BulkUpdateAsync|BulkDeleteAsync|BulkMergeAsync)\s*\(/,
  // Dapper — IDbConnection extension methods
  /\b(?:connection|conn|_conn|_connection)\.(Query|QueryAsync|QueryFirst|QueryFirstAsync|QueryFirstOrDefault|QueryFirstOrDefaultAsync|QuerySingle|QuerySingleAsync|QuerySingleOrDefault|QuerySingleOrDefaultAsync|QueryMultiple|QueryMultipleAsync|Execute|ExecuteAsync|ExecuteScalar|ExecuteScalarAsync|QueryDynamic)\s*[<("@\$]/,
  // LINQ query syntax (from … in … where … select)
  /\bfrom\s+\w+\s+in\s+(?:\w+|_?\w+)\s+(?:where|select|join|let|orderby)\b/,
  // ADO.NET raw
  /\b(?:cmd|command|_command)\.(ExecuteReader|ExecuteReaderAsync|ExecuteNonQuery|ExecuteNonQueryAsync|ExecuteScalar|ExecuteScalarAsync)\s*\(/,
  /new\s+SqlCommand\s*\(|new\s+NpgsqlCommand\s*\(|new\s+MySqlCommand\s*\(/,
  // Transactions
  /\b(?:context|db)\.(Database\.BeginTransaction|Database\.BeginTransactionAsync)\s*\(/,
  /using\s+var\s+\w+\s*=\s*(?:context|db)\.Database\.BeginTransaction/,
]

// ---------------------------------------------------------------------------
// Rust (full) — Diesel, SQLx, SeaORM
// ---------------------------------------------------------------------------
const RUST_PATTERNS: RegExp[] = [
  // Diesel — DSL imports and table macro
  /schema::\w+::dsl::/,
  /diesel::(insert_into|update|delete|select|sql_query|sql)\s*\(/,
  // Diesel — query building
  /\.(filter|or_filter|find|select|distinct|order|order_by|then_order_by|limit|offset|inner_join|left_join|left_outer_join|group_by|having|for_update|for_share|no_wait|skip_locked|into_boxed)\s*\(/,
  // Diesel — execution
  /\.load::<|\.get_result::<|\.get_results::<|\.first::<|\.execute\s*\(&|\.count\(\)|\.single_value\(\)/,
  /\.load\s*::<|\.get_result\s*::<|\.get_results\s*::<|\.first\s*::<|\.execute\s*\(conn/,
  // Diesel — insert / update
  /insert_into\s*\(\s*\w+::table\s*\)\s*\.values\s*\(/,
  /diesel::update\s*\(|\.set\s*\(.*\.(eq|ne|gt|lt|ge|le|is_null|is_not_null)\s*\(/,
  /diesel::delete\s*\(/,
  // SQLx — macro queries (most common pattern)
  /sqlx::query!\s*\(|sqlx::query_as!\s*\(|sqlx::query_scalar!\s*\(/,
  /\bquery!\s*\(|query_as!\s*\(|query_scalar!\s*\(/,
  // SQLx — runtime query builders
  /sqlx::query\s*[(\s]|sqlx::query_as\s*[(\s]|sqlx::query_scalar\s*[(\s]/,
  // SQLx — execution
  /\.(fetch_all|fetch_one|fetch_optional|fetch_many|execute|fetch)\s*\(\s*(?:&|pool|conn|tx)/,
  /\.(fetch_all|fetch_one|fetch_optional|execute)\s*\(&/,
  // SQLx — transactions
  /pool\.begin\s*\(\)|conn\.begin\s*\(\)|\.transaction\s*\(\s*\|/,
  /let\s+mut\s+\w+\s*=\s*\w+\.begin\s*\(\)\.await/,
  // SeaORM — entity operations
  /\w+::Entity::find\s*\(\)|Entity::find_by_id\s*\(/,
  /\w+::Entity::(insert|update|delete|find)\s*\(/,
  /ActiveModel\s*\{|ActiveModelTrait/,
  // SeaORM — query building
  /\.(filter|order_by|order_by_asc|order_by_desc|limit|offset|all|one|count|into_json|into_model|into_tuple|find_related|find_linked|columns|column|having|group_by|join|join_as|left_join|inner_join)\s*\(/,
  // SeaORM — execution
  /\.(all|one|count|exists|insert|update|save|delete|exec_with_returning)\s*\(\s*(?:db|conn|txn)/,
  /\bTxnErr\b|db\.transaction\s*\(/,
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
    depth: 'full',
    orms: ['Hibernate/JPA', 'Spring Data', 'MyBatis', 'jOOQ'],
  },
  {
    language: 'Ruby',
    depth: 'full',
    orms: ['ActiveRecord', 'Sequel'],
  },
  {
    language: 'PHP',
    depth: 'full',
    orms: ['Eloquent', 'Doctrine'],
  },
  {
    language: 'C#',
    depth: 'full',
    orms: ['Entity Framework Core', 'Dapper'],
  },
  {
    language: 'Rust',
    depth: 'full',
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
