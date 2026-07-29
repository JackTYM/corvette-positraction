import type { Item, Category, FieldDef, AttributeFilterValue } from '~/utils/catalog'
import { CATEGORY_FIELDS, freshAttributeFilters, matchesAttributeFilters, matchesTopLevelFilters, emptyTopLevelFilters } from '~/utils/catalog'

export function useCategoryFilter(items: Ref<Item[]>) {
  const filter = ref<'ALL' | Category>('ALL')
  const cats = computed(() => ['ALL', ...new Set(items.value.map((i) => i.category))] as ('ALL' | Category)[])
  const categoryFields = computed<FieldDef[]>(() => (filter.value === 'ALL' ? [] : CATEGORY_FIELDS[filter.value]))

  const attributeFilters = ref<Record<string, AttributeFilterValue>>(freshAttributeFilters(categoryFields.value))
  const topLevel = ref(emptyTopLevelFilters())

  // Dropdowns for free-text fields are populated from values that actually appear in the
  // current category's items, rather than left as freeform input -- there's no value in
  // letting someone type a maker/color that doesn't exist in their own collection.
  const itemsInCategory = computed(() => (filter.value === 'ALL' ? [] : items.value.filter((i) => i.category === filter.value)))
  function distinctValues(values: (string | undefined)[]): string[] {
    return [...new Set(values.filter((v): v is string => !!v?.trim()))].sort()
  }
  const makerOptions = computed(() => distinctValues(itemsInCategory.value.map((i) => i.maker)))
  const conditionOptions = computed(() => distinctValues(itemsInCategory.value.map((i) => i.condition)))
  const attributeOptions = computed(() => {
    const map: Record<string, string[]> = {}
    for (const f of categoryFields.value) {
      if (f.type === 'text') map[f.key] = distinctValues(itemsInCategory.value.map((i) => i.attributes[f.key] as string | undefined))
    }
    return map
  })

  function isFilterFieldVisible(f: FieldDef): boolean {
    return !f.showWhen || attributeFilters.value[f.showWhen.key] === f.showWhen.equals
  }
  const visibleFilterFields = computed(() => categoryFields.value.filter(isFilterFieldVisible))

  // Category is opt-in: switching it must fully reset any attribute/top-level filters
  // from the previous category rather than leaking them into the new field set.
  watch(filter, () => {
    attributeFilters.value = freshAttributeFilters(categoryFields.value)
    topLevel.value = emptyTopLevelFilters()
  })

  function clearFilters() {
    attributeFilters.value = freshAttributeFilters(categoryFields.value)
    topLevel.value = emptyTopLevelFilters()
  }

  const shown = computed(() => items.value.filter((i) => {
    if (filter.value === 'ALL') return true
    if (i.category !== filter.value) return false
    if (!matchesTopLevelFilters(i, topLevel.value)) return false
    return matchesAttributeFilters(i, categoryFields.value, attributeFilters.value)
  }))

  function countFor(c: Category) { return items.value.filter((i) => i.category === c).length }

  return {
    filter,
    cats,
    categoryFields,
    attributeFilters,
    topLevel,
    makerOptions,
    conditionOptions,
    attributeOptions,
    visibleFilterFields,
    clearFilters,
    shown,
    countFor,
  }
}
