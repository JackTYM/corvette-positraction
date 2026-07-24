<template>
  <div class="screen-only">
    <Masthead />
    <SectionTabs />
    <slot />
    <footer style="border-top: 3px solid var(--ink); margin-top: 30px;">
      <HalftoneBand color="var(--ink)" :height="8" opacity="calc(var(--halftone) * 0.5)" />
      <div class="wrap" style="padding: 22px 26px 30px; display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 10px;">
        <span style="font-family: var(--font-display); font-weight: 800; font-size: 18px;">CORVETTE <span style="color: var(--orange);">POSITRACTION</span></span>
        <span class="kicker" style="color: var(--muted);">corvettepositraction.com · 1953 to present · filed by hand</span>
      </div>
    </footer>
  </div>
</template>
