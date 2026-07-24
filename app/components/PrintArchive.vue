<template>
  <div class="print-only" style="padding: 0; color: #1C1814;">
    <div style="border-bottom: 3px solid #1C1814; padding-bottom: 10px; margin-bottom: 16px;">
      <div style="font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.24em; font-size: 11px; color: #D4500A;">The Collector's Quarterly · Complete Archive</div>
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <h1 style="font-family: var(--font-display); font-weight: 900; font-size: 38px;">CORVETTE POSITRACTION</h1>
        <div style="font-family: var(--font-cond); font-size: 12px;">{{ s.total }} items · {{ fmtMoney(s.value) }} total · printed {{ fmtDate(today) }}</div>
      </div>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-family: var(--font-serif); font-size: 12.5px;">
      <thead>
        <tr style="border-bottom: 2px solid #1C1814; text-align: left; font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.1em; font-size: 10.5px;">
          <th style="padding: 6px 8px 6px 0;">Item</th>
          <th style="padding: 6px 8px;">Cat.</th>
          <th style="padding: 6px 8px;">Gen</th>
          <th style="padding: 6px 8px;">Year</th>
          <th style="padding: 6px 8px;">Maker</th>
          <th style="padding: 6px 8px;">Location</th>
          <th style="padding: 6px 8px; text-align: right;">Paid</th>
          <th style="padding: 6px 0 6px 8px; text-align: right;">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in items" :key="it.id" style="border-bottom: 1px solid rgba(28,24,20,0.25);">
          <td style="padding: 7px 8px 7px 0; font-weight: 600;">{{ it.title }} <span style="color: #7A6A58; font-style: italic; font-weight: 400;">— {{ it.sub }}</span></td>
          <td style="padding: 7px 8px; font-family: var(--font-cond); font-size: 11px;">{{ it.category }}</td>
          <td style="padding: 7px 8px;">{{ it.generation }}</td>
          <td style="padding: 7px 8px;">{{ it.year }}</td>
          <td style="padding: 7px 8px;">{{ it.maker }}</td>
          <td style="padding: 7px 8px; color: #7A6A58;">{{ it.location }}</td>
          <td style="padding: 7px 8px; text-align: right;">{{ fmtMoney(it.pricePaid) }}</td>
          <td style="padding: 7px 0 7px 8px; text-align: right; font-weight: 700; color: #D4500A;">{{ fmtMoney(it.value) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { stats, fmtMoney, fmtDate, type Item } from '~/utils/catalog'

const props = defineProps<{ items: Item[] }>()
const s = computed(() => stats(props.items))
const today = new Date().toISOString().slice(0, 10)
</script>
