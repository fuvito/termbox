export interface TermEntry {
  id: string            // `${sourceId}_${rowIndex}`
  term: string
  fullForm: string | null
  definition: string
  domain: string | null
  sourceReference: string | null
  aliases: string[]
  sourceId: string
}

export interface GlossarySource {
  id: string            // crypto.randomUUID()
  name: string
  type: 'file' | 'url'
  url: string | null
  termCount: number
  lastLoaded: string    // ISO 8601
  autoRefresh: boolean
}
