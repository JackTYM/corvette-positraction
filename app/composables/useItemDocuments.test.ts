import { describe, it, expect } from 'vitest'
import { fromDocumentRow, type DocumentRow } from './useItemDocuments'

const row: DocumentRow = {
  id: 'doc-1', user_id: 'user-1', item_id: 'item-a', key: 'user-1/docs/uuid-manual.pdf',
  filename: 'manual.pdf', mime_type: 'application/pdf', size: 204800, created_at: '2020-01-01T00:00:00Z',
}

describe('fromDocumentRow', () => {
  it('maps snake_case DB columns to the camelCase ItemDocument shape', () => {
    expect(fromDocumentRow(row)).toEqual({
      id: 'doc-1', itemId: 'item-a', key: 'user-1/docs/uuid-manual.pdf',
      filename: 'manual.pdf', mimeType: 'application/pdf', size: 204800,
    })
  })
})
