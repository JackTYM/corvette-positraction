<template>
  <nav class="no-print sec-tabs">
    <div class="wrap tabs-scroll" style="display: flex; align-items: stretch; gap: 0;">
      <NuxtLink v-for="t in tabs" :key="t.id" :to="t.to" class="mag-tab" :class="{ active: isActive(t.id) }">
        <span class="mag-tab-sec">SEC. {{ t.num }}</span>
        <span class="mag-tab-label">{{ t.label }}</span>
      </NuxtLink>
      <NuxtLink to="/catalog" class="mag-tab mag-tab-catalog" :class="{ active: isActive('catalog') }">
        <span class="mag-tab-label">The Catalog</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const tabs = [
  { id: 'collection', label: 'Car Collection', num: '01', to: '/collection' },
  { id: 'garage', label: 'The Garage', num: '02', to: '/garage' },
  { id: 'wishlist', label: 'Wishlist', num: '03', to: '/wishlist' },
  { id: 'toc', label: 'Contents', num: '04', to: '/' },
  { id: 'add', label: 'Index a Find', num: '05', to: '/add' },
  { id: 'diecast-reference', label: 'Diecast Reference', num: '06', to: '/diecast-reference' },
]
function isActive(id: string): boolean {
  if (id === 'toc') return route.path === '/'
  if (id === 'collection') return route.path.startsWith('/collection')
  if (id === 'diecast-reference') return route.path.startsWith('/diecast-reference')
  if (id === 'wishlist') return route.path.startsWith('/wishlist')
  if (id === 'catalog') return route.path.startsWith('/catalog')
  return route.path === `/${id}`
}
</script>
