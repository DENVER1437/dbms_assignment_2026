# NormalizerPro — Design System (Extracted from Stitch MCP)

## Color Tokens

### Surface Hierarchy (Tonal Layering)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-deepest` | `#0a0d14` | Overlay backgrounds |
| `--bg` | `#0f1117` | Page background |
| `--bg2` | `#151820` | Card surfaces |
| `--bg3` | `#1a1f2e` | Inner surfaces, inputs |
| `--bg-high` | `#282a30` | Elevated cards, hovers |
| `--bg-highest` | `#33343b` | Popovers, dropdowns |
| `--bg-lowest` | `#0c0e14` | Code blocks, pre elements |

### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--teal` | `#00e5c4` | Primary accent, CTAs |
| `--teal-bright` | `#70ffe1` | Gradient endpoints, highlights |
| `--teal2` | `#00b89e` | Secondary teal |
| `--purple` | `#7c3aed` | Secondary accent, 3NF |
| `--purple-soft` | `#d2bbff` | Light purple text |
| `--gold` | `#f59e0b` | BCNF, warnings, professor |
| `--blue` | `#3b82f6` | 1NF, closure, info |
| `--green` | `#10b981` | Summary, success |
| `--red` | `#ef4444` | Errors, non-prime attrs |

### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `--text` | `#e2e8f0` | Primary text |
| `--text2` | `#94a3b8` | Secondary text |
| `--text3` | `#64748b` | Muted labels |

### Border & Ghost
| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#1e2538` | Hard borders (minimal) |
| `--ghost` | `rgba(59,74,69,.35)` | Subtle ghost borders |

## Typography

| Role | Font | Weight | Size | Line-Height | Tracking |
|------|------|--------|------|-------------|----------|
| Display/Hero | Inter | 800 | clamp(2.4rem,6vw,3.8rem) | 1.15 | -0.03em |
| Section Title | Inter | 700 | 1.15rem | 1.3 | -0.01em |
| Card Title | Inter | 600 | 1rem | 1.4 | -0.01em |
| Body | Inter | 400 | .92rem | 1.8 | 0 |
| Label | Inter | 600 | .78rem | 1 | .08em |
| Code/Schema | JetBrains Mono | 500 | .85rem | 1.65 | 0 |
| Badge | Inter | 700 | .7rem | 1 | .1em |

## Spacing Scale (8pt Grid)
`4px · 8px · 12px · 16px · 20px · 24px · 32px · 40px · 48px · 64px`

| Component | Padding | Gap |
|-----------|---------|-----|
| Card body | 1.5rem (24px) | — |
| Card header | 1.1rem 1.5rem | .75rem |
| Button primary | 1rem 3rem | — |
| Button secondary | .75rem 1.75rem | — |
| Badge | .3rem .75rem | — |
| Input | .75rem 1rem | — |
| Schema chip | .5rem 1.1rem | — |

## Component Patterns

### Cards
- Parent radius: `20px`, inner radius: `12px`
- Border: `1px solid var(--ghost)`
- Left stripe: `4px solid [NF-color]`
- Shadow: `0 4px 32px rgba(0,0,0,.25)`
- Hover: `translateY(-2px)`, shadow intensified
- Header bg: `rgba(25,27,34,.4)` with bottom ghost border
- Entrance: `fadeUp .55s cubic-bezier(.4,0,.2,1)`

### Buttons
- Primary: `linear-gradient(135deg, #00e5c4, #70ffe1)`, glow `0 0 24px rgba(0,229,196,.25)`
- Hover glow: `0 0 40px rgba(0,229,196,.45), 0 0 80px rgba(0,229,196,.15)`
- Secondary: `rgba(124,58,237,.1)` bg, `rgba(124,58,237,.4)` border
- Ghost: `transparent` bg, `var(--ghost)` border → teal on hover
- Min height: 44px, radius: 10px (standard), 999px (pill)

### Badges
- Radius: `8px`, padding: `.3rem .75rem`
- Letter-spacing: `.1em`, uppercase, weight 700
- Color-coded with 10-12% opacity backgrounds

### Inputs
- Background: `#0c0e14`
- Border: `1px solid var(--ghost)`
- Focus: `box-shadow: 0 0 0 3px rgba(0,229,196,.1), 0 0 20px rgba(0,229,196,.06)`
- Radius: `10px`

## Animation & Transitions
| Property | Duration | Easing |
|----------|----------|--------|
| Default | `.25s` | `cubic-bezier(.4,0,.2,1)` |
| Card entrance | `.55s` | `cubic-bezier(.4,0,.2,1)` |
| Button hover | `.25s` | `cubic-bezier(.4,0,.2,1)` |
| Dot grid pulse | `4s` | `ease-in-out` infinite |
| Replay glow | `1.8s` | `ease` forwards |
| Button processing | `.8s` | `ease-in-out` infinite |

## Layout Rules
| Property | Value |
|----------|-------|
| Max content width | `1200px` |
| Page padding | `0 2rem 4rem` |
| Card gap | `2rem` |
| Navbar height | `64px` |
| Navbar blur | `blur(20px)` |
| Breakpoint (tablet) | `768px` |
| Breakpoint (mobile) | `480px` |
