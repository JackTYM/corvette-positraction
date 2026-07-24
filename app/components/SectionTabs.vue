<template>
  <nav class="no-print sec-tabs">
    <div class="wrap tabs-scroll" style="display: flex; align-items: stretch; gap: 0;">
      <NuxtLink v-for="t in tabs" :key="t.id" :to="t.to" class="mag-tab" :class="{ active: isActive(t.id) }">
        <span class="mag-tab-sec">SEC. {{ t.num }}</span>
        <span class="mag-tab-label">{{ t.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
const route = useRoute()
const tabs = [
  { id: 'toc', label: 'Contents', num: '01', to: '/' },
  { id: 'collection', label: 'The Collection', num: '02', to: '/collection' },
  { id: 'garage', label: 'The Garage', num: '03', to: '/garage' },
  { id: 'add', label: 'Index a Find', num: '04', to: '/add' },
]
function isActive(id: string): boolean {
  if (id === 'toc') return route.path === '/'
  if (id === 'collection') return route.path.startsWith('/collection')
  return route.path === `/${id}`
}
</script>
