import type { Request, Response } from 'express'
import { metaClient, MODELS, MODEL_TIERS } from '../_client.js'
import { AGENT_SYSTEM_PROMPT } from '../_prompt.js'

const ORM_PATTERNS = /prisma|typeorm|sequelize|drizzle|mikroorm|mongoose|knex|kysely|objection|waterline|bookshelf|findMany|findFirst|findUnique|findAll|findOne|findById|findByPk|findOrCreate|createQueryBuilder|getRepository|selectFrom|insertInto|updateTable|deleteFrom|em\.(find|persist|flush)|Model\.query|\$queryRaw|\$executeRaw|session\.(query|execute)|db\.session|\.objects\.(filter|get|all|create|update|delete)|joinedload|subqueryload|selectinload|select_related|prefetch_related|cursor\.execute|db\.(Find|First|Where|Preload|Joins|Create|Save|Delete|Count|Query|QueryRow|Get|Select|NamedExec)\(|NewSelect\(|NewInsert\(|createQuery\(|@Query|@Select|@Insert|@Update|@Delete|ActiveRecord|\$em->|\$qb->|DbContext|ToListAsync|FromSqlRaw|diesel::|sqlx::query|SeaORM|Entity::find|collection\.(find|find_one|insert_one|update_one|delete_one|aggregate|Find|FindOne|InsertOne|UpdateOne|DeleteOne|Aggregate)\(|MongoEngine|pymongo|motor\.motor|ScanCommand|QueryCommand|GetItemCommand|PutItemCommand|UpdateItemCommand|DeleteItemCommand|BatchGetItemCommand|BatchWriteItemCommand|GetCommand|PutCommand|UpdateCommand|DeleteCommand|BatchGetCommand|BatchWriteCommand|dynamoose\.model|DynamoDbClient|DynamoDbEnhancedClient|AmazonDynamoDB|@DynamoDbBean|@DynamoDbPartitionKey|Aws::DynamoDB|DynamoDbClient::|dynamodb\.Table\(|boto3\.(resource|client).*dynamodb|pynamodb|aws_sdk_dynamodb::|guregu\/dynamo|dynamodb\.(ScanInput|QueryInput|GetItemInput|PutItemInput)/i

export async function agentHandler(req: Request, res: Response) {
  const { files, schemaFiles, model: modelTier } = req.body as {
    files: Array<{ path: string; content: string }>
    schemaFiles?: Array<{ path: string; content: string }>
    model?: string
  }
  if (!files?.length) return res.status(400).json({ error: 'files array is required' })

  const ormFiles = files.filter(f => ORM_PATTERNS.test(f.content))
  if (!ormFiles.length) return res.status(200).json({ findings: [], message: 'No database queries detected' })

  const schemaPart = schemaFiles?.length
    ? schemaFiles.map(f => `// SCHEMA: ${f.path}\n${f.content}`).join('\n\n---\n\n') + '\n\n===\n\n'
    : ''
  const fileBundle = schemaPart + ormFiles.map(f => `// FILE: ${f.path}\n${f.content}`).join('\n\n---\n\n')
  const model = MODEL_TIERS[modelTier ?? ''] ?? MODELS.balanced

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Files-Scanned', String(files.length))
  res.setHeader('X-Orm-Files-Found', String(ormFiles.length))
  res.setHeader('X-Model-Used', model)

  try {
    res.write(`data: ${JSON.stringify({ model })}\n\n`)

    const stream = await metaClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
        { role: 'user', content: fileBundle }
      ],
      stream: true
    })

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? ''
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Agent scan failed'
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`)
      res.end()
    } else {
      res.status(500).json({ error: message })
    }
  }
}
