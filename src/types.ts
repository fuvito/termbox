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
  secured: boolean
}

export interface SecureSourceMeta {
  sourceId: string
  pinSalt: string
  pinEncDek: { iv: string; ct: string }       // DEK encrypted with PIN-derived key
  recoverySalt: string
  recoveryEncDek: { iv: string; ct: string }  // DEK encrypted with recovery-key-derived key
  recoveryKeyHash: string                      // SHA-256 of raw recovery key for verification
}
