<template>
  <article class="editorial-card" @click="$emit('open', item)">
    <div class="editorial-card-photo photo-frame">
      <img v-if="item.imgKey" :src="`${imageBaseUrl}/${item.imgKey}`" :alt="item.title" class="editorial-card-img" />
      <div v-else class="editorial-card-placeholder">No photo yet</div>
      <div class="halftone-dots" style="position: absolute; inset: 0; color: var(--ink); opacity: calc(var(--halftone) * 0.22); pointer-events: none; mix-blend-mode: multiply;" />
      <div style="position: absolute; top: 12px; left: 12px;"><Stamp :category="item.category" /></div>
      <div style="position: absolute; top: 12px; right: 12px;"><GenTag :gen="item.generation" /></div>
    </div>
    <div class="editorial-card-body">
      <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 6px;">
        <span class="color-swatch" :style="{ background: colorOf(item).hex }" :title="colorOf(item).name" />
        <span class="kicker" style="color: var(--orange);">{{ item.year }} · {{ item.maker }}</span>
      </div>
      <h3 style="font-size: 24px; line-height: 0.96; margin-bottom: 6px;">{{ item.title }}</h3>
      <p style="font-style: italic; color: var(--muted); font-size: 14.5px; margin: 0; line-height: 1.3;">{{ item.sub }}</p>
      <hr class="rule-thin" style="margin: 13px 0 11px;" />
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: auto;">
        <div>
          <div class="kicker" style="font-size: 10.5px; color: var(--muted); letter-spacing: 0.18em;">Est. Value</div>
          <ValueNote :value="item.value" :size="30" />
        </div>
        <div style="text-align: right; font-size: 12.5px; color: var(--muted); line-height: 1.4;">
          <div>{{ item.scale || '—' }}</div>
          <div style="font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px;">Acq. {{ acquiredYear }}</div>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { colorOf, type Item } from '~/utils/catalog'
const props = defineProps<{ item: Item }>()
defineEmits<{ open: [item: Item] }>()
const cfg = useRuntimeConfig()
const imageBaseUrl = cfg.public.imageBaseUrl
const acquiredYear = computed(() => (props.item.acquired ? new Date(props.item.acquired + 'T00:00:00').getFullYear() : '—'))
</script>
