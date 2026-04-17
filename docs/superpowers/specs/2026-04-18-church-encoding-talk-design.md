# Design — "Algebraic Data Type for FUN: An Introduction to Church Encoding"

**Date:** 2026-04-18
**Venue:** meetup-style talk, ~20 minutes
**Deliverable:** Slidev deck in this repo, deployed to GitHub Pages

## 1. Goals

Teach a mixed developer audience (working devs comfortable with TS generics / Rust
enums / Haskell sum types + developers who have never seen sum types at all) what
Church encoding is and why it matters — building to a unified "aha" along three
dimensions:

- **A — FUNctions:** derive `Bool` and `if` from pure lambdas on stage.
- **B — FUN punchline:** show `match` is sugar for function application.
- **C — Lens:** a value *is* its own eliminator.

The three payoffs are one insight seen from three angles. The slide arc earns C
by constructing A; B falls out almost for free.

**Non-goals.** Church→Scott→Böhm-Berarducci tour; Y combinator / recursion
encoding; rigorous proof that the dialect is sound. This is pedagogy, not a PL
paper.

## 2. Audience & constraints

- **Profile:** mixed developer meetup. Some know TS/Rust enums; some have never
  matched on a sum type. Plan for the lower floor; give the higher ceiling a
  lens they can carry home.
- **Time budget:** 20 minutes hard. One cut point in segment A, one in the tour,
  used in that order if overrun.
- **Prose language:** Korean.
- **Code / dialect:** bespoke STLC-based language (see §3). Not TS, not Haskell.
- **Math rendering:** KaTeX via Slidev's built-in support. Used sparingly — the
  code *is* the math in this talk.

## 3. Dialect specification

A pedagogical language. Theoretical basis: Simply-Typed Lambda Calculus.
Semantics mostly Haskell-flavored (pure, algebraic). Syntax mostly OCaml for
data definitions, Java for lambda / apply.

### 3.1 Data

```
data Bool       = .true + .false
data Maybe[A]   = .none + .some(A)
data Pair[A, B] = .pair(A, B)
data List[A]    = .nil + .cons(A, List[A])
```

- Constructor names are `.`-prefixed (OCaml polymorphic-variant style).
- Alternation is `+` ("sum type" reads literally).
- Generics use `[A]` brackets.
- Multi-field constructors take comma-separated args: `.cons(A, List[A])`.

### 3.2 Terms

Only lambda and application exist as terms. No top-level bindings.

```
x -> x              // lambda, no parens
x -> y -> x         // curried; no multi-arg sugar
f(x)                // application
f(x)(y)             // curried application; no f(x, y) sugar
```

### 3.3 `let` is sugar

```
let id = x -> x in id(.zero)
≡  (id -> id(.zero))(x -> x)
```

Shown once on slide 6 to make the desugaring visible, then used freely.

### 3.4 Elimination

Native `match` exists specifically so the talk can contrast it with the
encoded form. Comma-separated, curly braces:

```
match x { .a -> b, .c -> d }
```

### 3.5 Types

Parametric types in §3.1 strictly go beyond pure STLC (really HM / System F).
The talk handwaves this — "typed enough, not fussy" — and keeps types mostly
invisible on slides. A single primer slide acknowledges their presence.

## 4. Structural approach

**Approach 1 — "Problem → Primitive → Power" (bottom-up).** Earns the C lens by
constructing A; B follows almost for free. Most forgiving under time pressure —
cut points are non-structural.

## 5. Arc & timing

| # | Segment              | Slides | Budget |
|---|----------------------|--------|--------|
| 1 | Title + hook         | 2      | 2m     |
| 2 | ADT intro            | 3      | 3m     |
| 3 | Lambda primer        | 2      | 2m     |
| 4 | **A — derive Bool**  | 4      | 4m     |
| 5 | **B — match is apply** | 2    | 2m     |
| 6 | **C — lens**         | 2      | 2m     |
| 7 | Tour (Maybe/Pair/List) | 3    | 3m     |
| 8 | Punchline + thanks   | 2      | 2m     |

Total: 20 slides / 20 minutes. Zero buffer.

**Cut points** (in order): slide 11 (and/or/not), then slide 18 (List).

## 6. Slide-by-slide outline

### §1 · 도입부 (2 slides)

**1. Title.** "FUN을 위한 대수적 자료형 — Church Encoding 입문" + 부제 + 발표자.

**2. Hook.** "만약 당신의 언어에 `if`가 없다면? `enum`이 없다면? `match`가 없다면?" →
"오늘: 함수만으로 다시 만들어봅니다."

### §2 · ADT 소개 (3 slides)

**3. `Bool`.** `data Bool = .true + .false`. `match` 예시. "생성자가 둘뿐인 enum."

**4. `Maybe`.** `data Maybe[A] = .none + .some(A)`. nullable 대체라는 프레임.

**5. `Pair`.** `data Pair[A, B] = .pair(A, B)`. "합(`+`)과 곱(`,`)의 조합 = 대수적
자료형." 슬라이드 제목에 "algebraic" 의 의미 노출.

### §3 · 람다 방언 primer (2 slides)

**6. 표기법.** `x -> x`, `x -> y -> x`, `f(x)`, `f(x)(y)`, `let ... in ...` 한
줄짜리 desugar.

**7. 타입은 있지만 안 보이게.** "STLC 기반. 일단 값과 적용에 집중." 한 슬라이드로 방어.

### §4 · A — Church Bool 과 if 유도 (4 slides) ★

**8. 제약.** "data 선언 없이, 함수만으로 `Bool` 을 만들어봅시다." 생각거리.

**9. 유도.** "`Bool` 값 = 두 선택지 중 하나를 고르는 자." →
`.true := t -> f -> t`, `.false := t -> f -> f`.

**10. 작동 확인.** `.true(1)(2) → 1`, `.false(1)(2) → 2`. `if` 의 필요성 재검토 —
Church Bool 은 자기 자신이 `ifelse` 다.

**11. 보너스 (cut point ①).** `and := a -> b -> a(b)(.false)`, `or`, `not`. "논리
연산이 그냥 적용이다."

### §5 · B — match 는 적용이다 (2 slides)

**12. 병치.** 같은 슬라이드 위아래:
```
match b { .true -> t, .false -> f }
// vs
b(t)(f)
```
두 줄은 **같은 모양**이다.

**13. 펀치.** "match 는 적용의 설탕이다. 컴파일러가 하던 일 = 방금 우리가 한 일."

### §6 · C — 값 = 자기 자신의 eliminator (2 slides) ★

**14. 렌즈.** "Church-encoded 값은 '나를 어떻게 소비할지'를 받는 함수다."

**15. 일반 공식.** 변형(variant) 마다 핸들러를 하나씩 받아 자기 분기에 적용. 이것이
모든 ADT 에 통한다는 주장.

### §7 · 투어: 렌즈 재적용 (3 slides)

각 슬라이드는 동일 템플릿 — *encoding → eliminator → 구체 예*.

**16. `Maybe`.**
- Encoding: `.none := n -> s -> n`, `.some(a) := n -> s -> s(a)`
- Eliminator: `match m { .none -> d, .some(x) -> f(x) } ≡ m(d)(f)`

**17. `Pair` — 유일 변형, 다중 필드.**
- Encoding: `.pair(a)(b) := p -> p(a)(b)`
- Eliminator: `match p { .pair(a, b) -> e } ≡ p(a -> b -> e)`
- 예: `fst := p -> p(a -> b -> a)`, `snd := p -> p(a -> b -> b)`

**18. `List` — 재귀 자료형 (cut point ②).**
- Encoding: `.nil := n -> c -> n`, `.cons(h, t) := n -> c -> c(h)(t)`
- Eliminator = `foldr` 그 자체

### §8 · 마무리 (2 slides)

**19. 펀치라인.** 세 줄:
- Sum types are **curried dispatch**
- `match` is just **application**
- **Data is behavior**

**20. 감사 + Q&A.** 더 읽어보기: TAPL, "데이터형 = eliminator" 렌즈 확장
(Scott / Böhm-Berarducci 티저).

## 7. Technical / Slidev setup

- **Theme:** `seriph` (already installed). Revisit if we want something more
  playful — not blocking.
- **File:** rewrite [slides.md](../../../slides.md) per §6. Remove the scaffold's
  Maxwell/softmax examples.
- **Per-slide layout:** mostly default. Slides 12 and 16–18 benefit from
  `layout: two-cols` (match vs encoded form side-by-side).
- **Code rendering:** bespoke dialect has no registered language. Use Shiki's
  plain fenced blocks with a close-enough grammar (likely `haskell` or `ocaml`)
  for syntax coloring — pick whichever renders the dialect's `.`-constructors
  least badly. Verify before committing.
- **Math:** KaTeX available, likely unused. Reserved for any last-slide formal
  notation if desired.
- **Fonts:** default seriph pairing. Korean fallback via system fonts; verify on
  build.
- **Deployment:** existing workflow at [.github/workflows/deploy.yml](../../../.github/workflows/deploy.yml)
  publishes to GH Pages on push to `main`. No changes needed.

## 8. Risks

- **Segment 4 overrun** is the dominant risk. Mitigation: cut points built in;
  slide 11 is the first to drop.
- **Dialect uncanny valley.** Audience may be distracted by unfamiliar syntax.
  Mitigation: slide 6 primer + one "don't worry about types" slide; constructor
  dot-prefix is visually distinctive so it reads as "marker," not noise.
- **Korean + bespoke syntax on GH Pages fonts.** Verify rendering on Actions
  runner's Chromium before trusting the export.

## 9. Open questions

None load-bearing. Minor follow-ups deferred to the implementation plan:

- Shiki highlighter choice for the dialect
- Whether to add a `<!-- notes: -->` block to every slide for speaker prep
- Slide transitions (default `slide-left` is fine unless argued otherwise)
