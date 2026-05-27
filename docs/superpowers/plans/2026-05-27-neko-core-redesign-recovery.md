# Neko Core Redesign Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current PR from a dashboard-with-pet surface into a coherent consumer pet-sim daily loop with one main character, one action, one emotional reward, and one visible next progression.

**Architecture:** Delete the dashboard-first homepage structure and make `PetCard` the primary product surface. Use one consistent visual asset model, then move metrics, rewards, achievements, and records into secondary surfaces that do not compete with Neko.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, existing localStorage app state.

---

## Agent Review Summary

Three independent reviewers agreed on the same root cause:

- The app still reads as a dashboard because it shows cards, metrics, tabs, records, rewards, and unlock grids immediately.
- The hero is visually confused because a full room GIF is placed inside a second CSS-generated room.
- The design mixes pixel art, emoji, glass cards, finance widgets, and hand-built CSS props.
- The copy explains the loop instead of making the loop felt.
- Mobile is usable but cramped, with too many stacked modules in the first journey.

## Target Product Shape

The first screen should answer only:

- How is Neko today?
- What one thing do I do now?
- What immediately changes after I do it?
- What is the next visible room/world reward?

Everything else is secondary.

---

### Task 1: Fix PR Preview Visibility

**Files:**
- GitHub PR #7 body

- [x] **Step 1: Put preview link at the top of the PR body**

Expected PR body opening:

```markdown
## Preview

https://pet-app-git-core-experience-redesign-vic4codes-projects.vercel.app
```

- [x] **Step 2: Confirm PR exists**

PR:

```text
https://github.com/Cathay-AI/pet-app/pull/7
```

---

### Task 2: Choose One Asset Model

**Files:**
- Modify: `src/components/PetCard.tsx`
- Modify: `src/app/globals.css`
- Optional create: `public/neko-idle.png`
- Optional create: `public/neko-happy.gif`

- [ ] **Step 1: Remove the mixed room model**

Delete either:

- the CSS fake room layers, if `/cat.gif` remains the full room scene
- or the full rectangular room GIF, if the app uses a transparent Neko sprite

The recommended MVP path is:

```text
Use /cat.gif as the whole room scene for now.
Remove CSS floor/window/shelf/emoji props from PetCard.
Place UI outside or as minimal overlays around the image.
```

- [ ] **Step 2: Remove emoji props from the room**

Remove platform emoji room objects:

```tsx
🪴 🫙 ✨ 🔒 🪙 🔥
```

Replace them with text labels or small CSS/vector tokens until a consistent icon set exists.

- [ ] **Step 3: Add explicit asset dimensions**

Use a stable scene container:

```tsx
<div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-[#efe1c8]">
  <img alt="Neko in room" className="h-full w-full object-cover" src="/cat.gif" />
</div>
```

Expected result: no room-inside-room effect.

---

### Task 3: Rebuild First Viewport Around One Ritual

**Files:**
- Modify: `src/components/PetCard.tsx`
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Remove the split hero explanation panel**

Current problem: `PetCard` has scene on the left and a SaaS text/action column on the right.

Replace with a single hero surface:

```tsx
<section className="neko-home">
  <PetScene />
  <DailyActionBar />
  <NextReward />
</section>
```

- [ ] **Step 2: Move the action into a compact ritual bar**

Required content:

```text
今天：存下 $488
CTA：存下今日一筆
Reward：小窩會亮起來
Next：再 $4,700 解鎖窗邊植物
```

- [ ] **Step 3: Delete the visible three-task card grid from the default screen**

Remove default rendering of:

```tsx
今日核心循環
今天存下 300 元
今天少買一杯飲料
今天記錄一筆消費
```

Keep alternate task ideas only inside the modal or a later secondary view.

---

### Task 4: Move Progression Into the World

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Optional create: `src/lib/progression.ts`

- [ ] **Step 1: Replace metric cards with next milestone**

Remove first-level metric cards:

```text
現在 / 目標 / 完成
```

Use:

```tsx
const nextUnlock = {
  name: "窗邊植物",
  remainingAmount: 4700,
  percent: 15
};
```

Show:

```text
下一個小窩變化：窗邊植物
再存 $4,700 解鎖
```

- [ ] **Step 2: Hide full financial detail behind a secondary view**

Keep financial numbers available, but not in the first emotional loop.

Expected structure:

```text
Primary: Neko + today action + next room unlock
Secondary: goal detail, records, achievements, rewards
```

---

### Task 5: Build Emotional Feedback

**Files:**
- Modify: `src/components/PetCard.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace caption bar with speech bubble**

Current issue: feedback looks like a label.

Use:

```tsx
<p aria-live="polite" className="speech-bubble">
  {feedback}
</p>
```

- [ ] **Step 2: Add completion reward state**

After submitting progress:

```text
Neko reacts
coins increment
streak updates
next unlock glows
```

- [ ] **Step 3: Keep motion restrained**

CSS should include:

```css
@media (prefers-reduced-motion: reduce) {
  .room-glow,
  .pet-bounce,
  .reward-pop {
    animation: none;
  }
}
```

---

### Task 6: Establish a Coherent Visual System

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts`
- Modify: `src/components/PetCard.tsx`
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Reduce palette**

Use:

```text
background: warm off-white
text: charcoal
action: mint
reward: amber
celebration: coral
```

Remove multi-gradient haze and most translucent cards.

- [ ] **Step 2: Reduce typography weight**

Replace most `font-black` with:

```text
H1: font-black or font-extrabold
Section title: font-bold
Body: font-medium
Labels: font-semibold
```

Target: at least 70% fewer `font-black` usages.

- [ ] **Step 3: Remove card soup**

Default homepage should have:

```text
1 immersive hero surface
1 compact ritual bar
1 next unlock strip
secondary drawer/nav below
```

Not:

```text
card inside card
metric cards inside panel
tabs as equal product pillars
locked item grid on first load
```

---

### Task 7: Fix Responsive and Accessibility Issues

**Files:**
- Modify: `src/components/Dashboard.tsx`
- Modify: `src/components/PetCard.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Fix grids**

Replace fixed three-column mobile-sensitive grids with:

```tsx
className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]"
```

- [ ] **Step 2: Add real tab semantics if tabs remain**

Use:

```tsx
<div role="tablist" aria-label="Neko secondary views">
  <button role="tab" aria-selected={activePanel === tab.id}>
    {tab.label}
  </button>
</div>
```

- [ ] **Step 3: Fix disabled cursor behavior**

Change global CSS:

```css
button:not(:disabled) {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}
```

---

### Task 8: Verification

**Files:**
- No source files required
- Screenshot outputs under `output/playwright/`

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 2: Verify core loop with browser automation**

Flow:

```text
open app
create goal
click 存下今日一筆
submit progress
confirm Neko feedback changed
confirm coins/streak changed
confirm next unlock/progression changed
```

- [ ] **Step 3: Capture desktop and mobile screenshots**

Expected:

```text
Desktop: first viewport is Neko/world/action, not dashboard.
Mobile: first viewport shows Neko status and CTA without cramped explanatory blocks.
```

- [ ] **Step 4: Update PR**

Push changes to:

```text
core-experience-redesign
```

PR:

```text
https://github.com/Cathay-AI/pet-app/pull/7
```

Confirm preview remains visible in PR body.

