---
theme: apple-basic
title: Algebraic Data Type for FUN — Introduction to Church Encoding
info: |
  Algebraic Data Type for FUN: An Introduction to Church Encoding.
  A 20-minute meetup talk.
layout: center
class: text-center
transition: slide-left
mdc: true
colorSchema: light
background: '#fff'
fonts:
  provider: none
  sans: 'Freesentation, Noto Sans KR, Twemoji, system-ui, sans-serif'
  serif: 'Freesentation, Noto Serif KR, Twemoji, serif'
  mono: '"JetBrains Mono", "Noto Sans KR", Twemoji, monospace'
---

# Algebraic Data Type for FUN

## Introduction to Church Encoding


---
layout: center
class: text-center
---

# Hello? 👋

<div class="flex flex-col items-center gap-3 mt-6">

<img src="https://github.com/RanolP.png" class="w-32 h-32 rounded-full" />

<div class="flex items-center gap-5 text-xl">
  <a class="inline-flex items-center gap-1.5 no-underline" href="https://github.com/RanolP"><span class="i-mdi-github" />RanolP</a>
  <a class="inline-flex items-center gap-1.5 no-underline" href="https://twitter.com/RanolP_777"><span class="i-mdi-twitter text-[#1DA1F2]" />RanolP_777</a>
</div>

<div class="text-base op-60">라프텔에서 프론트엔드 엔지니어를 맡고 있습니다. 톡기겅듀 아니애오.</div>

<div class="grid grid-cols-2 gap-2 mt-2 w-fit">
  <span class="px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-sm text-center font-['Galmuri9']">#회사로_바식스_모셔감</span>
  <span class="px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-sm text-center font-['Galmuri9']">#프로그래밍_언어론</span>
  <span class="px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-sm text-center font-['Galmuri9']">#CSE_몰라요</span>
  <span class="px-3 py-1 rounded-full bg-cyan-100 text-cyan-800 text-sm text-center font-['Galmuri9']">#프론트엔드가_뭐더라</span>
</div>

</div>

---
layout: default
class: text-left
---

# 정보의 구성

- 함께 다니는 것 — **Product**
- 함께 다닐 순 없는 것 — **Disjoint Sum**

둘을 합쳐서 **대수적 자료형(Algebraic Data Type)** 이라고 부른다. <br>
예시로 한 번 알아보자.

---
---

# Product

필드를 전부 **같이 사용할 수 있다**.

<div class="grid grid-cols-[2fr_3fr_4fr] gap-4 text-sm">

```rust
struct Point {
    x: i32,
    y: i32,
}
```

```ts
interface Point {
  x: number
  y: number
}
```

```kotlin
data class Point(
  val x: Int,
  val y: Int,
)
```

</div>

---
---

# Disjoint Sum

**겹치지 않는 하나**의 변종(Variant)만 온다.

<div class="grid grid-cols-[2fr_3fr_4fr] gap-4 text-sm">

```rust
enum Shape {
  Circle(f64),
  Square(f64),
}
```

```ts
type Shape =
  | { kind: 'circle'; r: number }
  | { kind: 'square'; s: number }
​
```

```kotlin
sealed interface Shape {
  data class Circle(val r: Double) : Shape
  data class Square(val s: Double) : Shape
}
```

</div>

---
---

# 단순한 언어로 써보기

Rust, TypeScript, Kotlin 모두 괜찮은 언어지만, **더 단순하게 서술해보자**.

```funnylambda
// 곱 타입
data Pair[A, B] = .pair(A, B)

// 합 타입
data Maybe[A]   = .none + .some(A)

// match 구문
match m {
  .none    -> 0,
  .some(x) -> x + 1
}
```

---
layout: default
class: text-left
---

# 단순한 언어라는 것은... (1)

`if` 가 없다면?

```funnylambda
if = cond -> then -> otherwise ->
  match cond {
    .true => then,
    .false => otherwise,
  }

// if (true) { 1 } else { 0 }
   if(.true) ( 1 )      ( 0 )
```

---
---


# 단순한 언어라는 것은... (2)

`data`도 `match`도 없다면?!?!

**있는 게 오직 함수** 뿐이라면?!?!

---
---

# `match` 없이 `if` 구현하기

<MatchDerivation :step="$slidev.nav.clicks" />
<span v-click="7" />

---
---

# 합 타입은 Case Work를 합한다

```funnylambda
// match
match b { .true  -> t, .false -> f }
// 이름 있는 인자
match(b)(  true   = t,  false  = f )
// 이름 없는 인자
match(b)(           t,           f )
// 커링
match(b)(           t)(          f )
// 항등함수 match 제거
      b (           t)(          f )
```

---
---

# 곱 타입 구성하기

<PairDerivation :step="$slidev.nav.clicks" />
<span v-click="6" />

---
---

# 값의 본질

새로운 종류의 값을 **도입(Introduce)** 한다는 것은,

값을 **소거(Eliminate)** 할 방법을 정의한다는 것이다.

<div v-click class="text-4 flex justify-center">

<div class="w-fit py-1 px-8 bg-cyan-200">

*이런 게 재밌다면 프로그래밍 언어론을 배워봅시다.*

<div class="text-3 text-left prod-rules">

$$
\frac{\Gamma \vdash a : A \qquad \Gamma \vdash b : B}{\Gamma \vdash (a, b) : A \times B}\ (\text{Prod-Intro}) \\[1em]
\frac{\Gamma \vdash p : A \times B}{\Gamma \vdash \textrm{fst }p : A}\ (\text{Prod-Elim}_1) \\[1em]
\frac{\Gamma \vdash p : A \times B}{\Gamma \vdash \textrm{snd }p : B}\ (\text{Prod-Elim}_2)
$$

</div>

</div>

<style scoped>
.prod-rules .katex-display,
.prod-rules .katex-display > .katex {
  text-align: left;
}
</style>

</div>

---
---

# 합 타입과 곱 타입의 쌍대성(Duality)

<div class="grid grid-cols-2 gap-6 mt-4">

<div v-click>

합 타입은 처리자의 묶음으로, 값이 하나다.
```funnylambda
left(1)(l -> ...)(r -> ...)
```

</div>

<div v-click>

곱 타입은 값의 묶음으로, 처리자가 하나다.
```funnylambda
pair(1, 2)(a -> b -> ...)
```

</div>

<div v-click>

거울처럼 뒤집히면 서로를 바라보는 관계를 쌍대성이라고 한다.

</div>

</div>

<div class="grid grid-cols-2 gap-6 mt-4">

<div v-click>

합 타입 값을 만들면 곱 타입 값을 소비할 수 있다.
```funnylambda
show(true)
    // ==> a -> b -> a
show(fst)
    // ==> a -> b -> a
pair(a)(b)(true)
    // ==> a
```

</div>

<div v-click>

곱 타입 값을 만들면 합 타입 값을 소비할 수 있다.
```funnylambda
show     (pair(_ -> true)(_ -> false))
         // ==> f -> f(_ -> true)(_ -> false)
if(true) (pair(_ -> true)(_ -> false))
         // ==> true
```

</div>

</div>

---
---

# 타입 다항식 🤔

<v-switch>

<template #0>

```funnylambda
// 덧셈
data Add[X] = .one + .two(X)
// 곱셈
data Square[X] = .pair(X, X)
```

</template>

<template #1>

```funnylambda
// 덧셈
data Add[X] = one + two × X
// 곱셈
data Square[X] = pair × X × X
```

</template>

<template #2>

```funnylambda
// 덧셈
data Add[X] = 1 + 1 × X
// 곱셈
data Square[X] = 1 × X × X
```

</template>

<template #3>

```funnylambda
// 덧셈
data Add[X] = 1 + X
// 곱셈
data Square[X] = X²
```

</template>

</v-switch>

---
---

# 타입 미분 🤔🤔🤔


<v-switch>

<template #0>

```funnylambda
data Original = X³ + X² + X + 1
```

</template>

<template #1>

```funnylambda
data Original = X³ + X² + X + 1
data Derivated = X -> 3 × X² + 2 × X + 1
```

</template>

<template #2>

```funnylambda
data Original = X³ + X² + X + 1
data Derivated = X -> 3 × X² + 2 × X + 1
data 3 = .first + .second + .third
data 2 = .first + .second
data 1 = .first
```

</template>

<template #3>

```funnylambda
data Original = X³ + X² + X + 1
data Derivated = X -> 3 × X² + 2 × X + 1
data 3 = .first + .second + .third
data 2 = .first + .second
data 1 = .first
```

```funnylambda
data Position3D = .pos(x: Int, y: Int, z: Int)
```

</template>

</v-switch>

---
layout: center
class: text-center
---

# 감사합니다


<div class="w-fit">

이런 게 재밌다면 **진지하게** 프로그래밍 언어론을 배워봅시다.

<div class="text-3 text-left prod-rules">

$$
\frac{\Gamma \vdash a : A \qquad \Gamma \vdash b : B}{\Gamma \vdash (a, b) : A \times B}\ (\text{Prod-Intro}) \\[1em]
\frac{\Gamma \vdash p : A \times B}{\Gamma \vdash \textrm{fst }p : A}\ (\text{Prod-Elim}_1) \\[1em]
\frac{\Gamma \vdash p : A \times B}{\Gamma \vdash \textrm{snd }p : B}\ (\text{Prod-Elim}_2)
$$

</div>

</div>
