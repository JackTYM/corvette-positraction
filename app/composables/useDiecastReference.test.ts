import { describe, it, expect } from 'vitest'
import { fromModelRow, fromVariantRow, type DiecastModelRow, type DiecastVariantRow } from './useDiecastReference'

const modelRow: DiecastModelRow = {
  id: 'model-1', manufacturer: 'Hot Wheels', name: '1953 corvette', source_url: 'https://smalldiecastcorvettes.com/car/4_HW_1953_corvette.html',
  cover_image_url: 'https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg', created_at: '2020-01-01T00:00:00Z', updated_at: '2020-01-01T00:00:00Z',
}

describe('fromModelRow', () => {
  it('maps snake_case DB columns to the camelCase DiecastModel shape', () => {
    expect(fromModelRow(modelRow)).toEqual({
      id: 'model-1', manufacturer: 'Hot Wheels', name: '1953 corvette',
      sourceUrl: 'https://smalldiecastcorvettes.com/car/4_HW_1953_corvette.html',
      coverImageUrl: 'https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg',
    })
  })
})

const variantRow: DiecastVariantRow = {
  id: 'variant-1', model_id: 'model-1', caption: 'Showcase #1 2 car set, license plate 1953, RR Whitewall Tires',
  image_url: 'https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg', sort_order: 0, created_at: '2020-01-01T00:00:00Z',
}

describe('fromVariantRow', () => {
  it('maps snake_case DB columns to the camelCase DiecastVariant shape', () => {
    expect(fromVariantRow(variantRow)).toEqual({
      id: 'variant-1', modelId: 'model-1', caption: 'Showcase #1 2 car set, license plate 1953, RR Whitewall Tires',
      imageUrl: 'https://smalldiecastcorvettes.com/imgitems/car_14_1.jpg', sortOrder: 0,
    })
  })
  it('preserves a null caption', () => {
    expect(fromVariantRow({ ...variantRow, caption: null }).caption).toBeNull()
  })
})
