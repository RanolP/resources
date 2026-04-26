---
theme: apple-basic
title: FUN을 위한 대수적 자료형 — Church Encoding 입문
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
  sans: 'Freesentation, Noto Sans KR, system-ui, sans-serif'
  serif: 'Freesentation, Noto Serif KR, serif'
  mono: '"JetBrains Mono", "Noto Sans KR", monospace'
---

# Algebraic Data Type for FUN

## Introduction to Church Encoding

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

<MatchDerivation />
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

<PairDerivation />
<span v-click="7" />

---
---

# 렌즈: 값 = 자기 자신의 eliminator

<div class="text-2xl mt-8">
Church-encoded 값은<br/>
"<strong>나를 어떻게 소비할지</strong>" 를 받는 함수다.
</div>

<div v-click class="mt-10 opacity-70">
생성자(constructor) 를 "구조" 로 보지 말고,<br/>
<strong>분기 선택기(branch selector)</strong> 로 보면 된다.
</div>

---
---

# 일반 공식

임의의 ADT 에 대해:

<div class="mt-6 text-lg space-y-3">

- 각 <strong>변형마다</strong> 핸들러를 하나씩 받는다
- 자신의 변형에 해당하는 핸들러에
- 자신이 담고 있는 필드를 인자로 넘겨 호출한다

</div>

<div v-click class="mt-8 text-xl">
<strong>같은 템플릿</strong>이 모든 ADT 에 통한다는 것을 지금부터 확인.
</div>

---
---

# 투어 ①: `Maybe`

```funnylambda
data Maybe[A] = .none + .some(A)
```

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

**Encoding**
```funnylambda
.none    := n -> s -> n
.some(a) := n -> s -> s(a)
```

</div>

<div>

**Eliminator**
```funnylambda
match m {
  .none    -> d,
  .some(x) -> f(x)
}
// ≡
m(d)(f)
```

</div>

</div>

---
---

# 투어 ②: `Pair` — 변형 하나, 필드 둘

```funnylambda
data Pair[A, B] = .pair(A, B)
```

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

**Encoding + Eliminator**
```funnylambda
.pair(a)(b) := p -> p(a)(b)

match p { .pair(a, b) -> e }
// ≡
p(a -> b -> e)
```

</div>

<div>

**사용**
```funnylambda
fst := p -> p(a -> b -> a)
snd := p -> p(a -> b -> b)
```

</div>

</div>

<div class="mt-4 opacity-70 text-sm">
곱도 같은 렌즈로 읽힌다 — 다만 핸들러가 하나일 뿐.
</div>

---
---

# 투어 ③: `List` — 재귀 자료형

```funnylambda
data List[A] = .nil + .cons(A, List[A])
```

```funnylambda
.nil        := n -> c -> n
.cons(h, t) := n -> c -> c(h)(t)
```

<div v-click class="mt-6 text-xl">
이 eliminator 의 이름을 당신은 이미 안다:<br/>
<strong><code>foldr</code></strong>.
</div>

<div v-click class="mt-4 opacity-70">
<code>foldr(nilCase)(consCase)(list)</code> = <code>list(nilCase)(consCase)</code>.
</div>

---
layout: center
class: text-center
---

# 요약

<div class="text-2xl space-y-6 mt-6">

Sum types are <strong>curried dispatch</strong>.

<code>match</code> is just <strong>application</strong>.

<strong>Data is behavior.</strong>

</div>

---
layout: center
class: text-center
---

# 감사합니다

<div class="opacity-70 mt-6">
질문 환영
</div>

<div class="mt-12 text-sm opacity-60 space-y-1">

더 읽어보기:

- Pierce, *Types and Programming Languages* — STLC, encoding 장
- Wadler, "Recursive types for free!" — 재귀 자료형의 encoding
- Scott / Böhm-Berarducci encoding — Church 의 그 다음 단계

</div>
