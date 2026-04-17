---
theme: seriph
title: Resources
info: |
  A Slidev deck scaffolded for vibe-coding math-heavy presentations.
class: text-center
transition: slide-left
mdc: true
---

# Resources

Vibe-coded slides with math, built with [Slidev](https://sli.dev)

<div class="pt-12">
  <span class="px-2 py-1 rounded cursor-pointer opacity-50 hover:opacity-100">
    Press <kbd>space</kbd> to begin →
  </span>
</div>

---
transition: fade-out
---

# What's in here

- ⚡️ Hot-reload Markdown authoring
- 🧮 KaTeX math — inline $E = mc^2$ and block
- 🎨 Tailwind / UnoCSS utilities
- 🖼️ Vue components per slide when you need them
- 📦 Exports to PDF / PPTX / static SPA
- 🚀 Deployed to GitHub Pages via CI

---

# Math, inline and block

Inline: the Gaussian integral $\int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}$.

Block:

$$
\mathcal{L}(\theta) = -\frac{1}{N} \sum_{i=1}^{N} \log p_\theta(y_i \mid x_i)
$$

Aligned:

$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0 \\
\nabla \times \mathbf{E} &= -\frac{\partial \mathbf{B}}{\partial t} \\
\nabla \times \mathbf{B} &= \mu_0 \mathbf{J} + \mu_0 \varepsilon_0 \frac{\partial \mathbf{E}}{\partial t}
\end{aligned}
$$

---
layout: two-cols
---

# Code on the left

```ts {all|2|4-6}
function softmax(xs: number[]): number[] {
  const m = Math.max(...xs)
  const exps = xs.map(x => Math.exp(x - m))
  const z = exps.reduce((a, b) => a + b, 0)
  return exps.map(e => e / z)
}
```

::right::

# Math on the right

$$
\mathrm{softmax}(x)_i = \frac{e^{x_i - m}}{\sum_j e^{x_j - m}}
$$

where $m = \max_j x_j$ for numerical stability.

---
layout: center
class: text-center
---

# Thanks

Edit [slides.md](./slides.md) and the browser will hot-reload.
