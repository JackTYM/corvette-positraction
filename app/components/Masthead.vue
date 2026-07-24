<template>
  <header style="background: var(--ink); color: var(--paper);">
    <HalftoneBand color="var(--orange)" :height="16" :opacity="0.9" />
    <div class="wrap" style="padding: 16px 26px 14px;">
      <div class="kicker" style="color: var(--orange); margin-bottom: 6px;">The Collector's Quarterly · Est. 1953</div>
      <h1 style="font-size: clamp(26px, 4.4vw, 50px); color: var(--paper); font-weight: 900; letter-spacing: -0.02em; line-height: 0.92;">
        CORVETTE <span style="color: var(--orange);">POSITRACTION</span>
      </h1>
    </div>
    <HalftoneBand color="var(--paper)" :height="10" :opacity="0.35" />
  </header>
</template>
