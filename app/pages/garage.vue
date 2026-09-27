<template>
  <div class="wrap" style="padding: 34px 26px 80px;">
    <div class="kicker" style="color: var(--orange); margin-bottom: 8px;">Section Two</div>
    <h2 style="font-size: clamp(38px, 6.5vw, 68px); line-height: 0.9; margin-bottom: 8px;">The Garage</h2>
    <p style="font-style: italic; color: var(--muted); font-size: 16.5px; margin: 0 0 6px; max-width: 620px;">
      A working plan of the display cases on the wall. Build each case to the size of the real frame, then arrange the cars by hand.
    </p>
    <p class="no-print" style="font-family: var(--font-cond); text-transform: uppercase; letter-spacing: 0.08em; font-size: 11.5px; color: var(--muted); margin: 0 0 22px;">
      Drag a car into any slot — everything after it slides down one, just like the shelf.
    </p>

    <div class="no-print garage-toolbar">
      <div style="flex: 1;" />
      <button class="btn ghost" style="padding: 7px 13px; font-size: 12px;" @click="formState = { add: true }">+ Add Case</button>
      <button v-if="order.length > 0" class="link-tab" style="font-size: 12px; padding: 6px 11px; border: 1.5px solid var(--rule); color: var(--muted);" @click="confirmEmptyWall">clear wall</button>
    </div>

    <div v-if="overflow.length > 0" class="wall-warn no-print">
      <span>▲ {{ overflow.length }} car{{ overflow.length > 1 ? 's' : '' }} won't fit — add a case or make one bigger.</span>
      <button class="icon-btn" style="border-color: var(--orange-deep); color: var(--orange-deep);" @click="formState = { add: true }">+ build a case</button>
    </div>

    <div v-if="cases.length === 0" class="collection-empty">
      <p style="font-style: italic; color: var(--muted); font-size: 17px; margin-bottom: 16px;">No cases on the wall yet.</p>
      <button class="btn primary" @click="formState = { add: true }">+ Build Your First Case</button>
    </div>

    <DisplayCase
      v-for="(c, i) in cases" :key="c.id" :c="c" :index="i" :order="order" :by-id="byId"
      :offset="offsets[i]" :cap="caps[i]" :bumped="bumped" :drag-id="dragId" :can-remove="cases.length > 1"
      @open="openItem" @eject="eject" @empty-slot="(seq) => (pickSeq = seq)"
      @edit="(idx) => (formState = { editIndex: idx })"
      @empty="emptyCase" @remove="removeCase" @drop-seq="moveTo"
      @dragstart="(id) => (dragId = id)" @dragend="() => (dragId = null)"
    />

    <div v-if="loose.length > 0" class="tray no-print" style="margin-top: 8px;" @dragover.prevent @drop.prevent="onTrayDrop">
      <div class="tray-head">
        <div>
          <div class="kicker" style="color: var(--muted); font-size: 10px;">Not on the wall</div>
          <div style="font-family: var(--font-display); font-weight: 800; font-size: 20px;">{{ loose.length }} car{{ loose.length > 1 ? 's' : '' }} waiting</div>
        </div>
      </div>
      <div class="tray-grid">
        <TrayCar v-for="it in loose" :key="it.id" :item="it" @open="openItem" @dragstart="() => (dragId = it.id)" @dragend="() => (dragId = null)" />
      </div>
    </div>

    <CaseForm v-if="formState?.add" @save="addCase" @cancel="formState = null" />
    <CaseForm v-else-if="formState?.editIndex != null" :initial="cases[formState.editIndex]" @save="(v) => editCase(formState!.editIndex!, v)" @cancel="formState = null" />
    <SlotPicker v-if="pickSeq != null" :candidates="loose" @close="pickSeq = null" @pick="(id) => { moveTo(id, pickSeq!); pickSeq = null }" />
  </div>
</template>

<script setup lang="ts">
import { GARAGE_CATEGORIES } from '~/utils/catalog'

const {
  cases, order, byId, offsets, caps, overflow, loose,
  dragId, bumped, formState, pickSeq,
  moveTo, eject, emptyCase, confirmEmptyWall, onTrayDrop,
  addCase, editCase, removeCase, openItem,
} = await useWallPage('garage', GARAGE_CATEGORIES)
</script>
