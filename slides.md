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

<MatchDerivation v-click="3" />
<span v-click="7" />

---
---

# 타입은 있지만…

이 언어는 <strong>Simply-Typed Lambda Calculus</strong> 위에 얹혀 있음.

<div class="mt-6">

- 모든 식에 타입이 존재
- 하지만 오늘은 <strong>값</strong>과 <strong>적용</strong>에 집중
- 타입은 필요한 슬라이드에서만 표기

</div>

<div class="mt-8 opacity-60 text-sm">
※ 제네릭(<code>Maybe[A]</code>)은 엄밀히는 STLC 를 벗어나지만,
그 얘기는 오늘 하지 않음.
</div>

---
---

# 실험: `if` 를 직접 만들어보자

<div class="text-xl mt-8">
제약: <code>data</code> 선언 <strong>없이</strong>, 함수만으로.
</div>

<div class="mt-8 text-xl">
힌트: <code>Bool</code> 값은 <em>무엇을 하는 자</em>인가?
</div>

<div v-click class="mt-8 text-2xl">
→ <strong>두 선택지 중 하나를 고르는 자.</strong>
</div>

---
---

# Church `Bool` 유도

```funnylambda
// 두 선택지를 받아 하나를 반환하는 함수 

.true  := t -> f -> t

.false := t -> f -> f
```

<div class="mt-6 opacity-70">
"참" 이란 두 값을 받아 <em>첫째</em>를 고르는 것.<br/>
"거짓" 이란 두 값을 받아 <em>둘째</em>를 고르는 것.
</div>

---
---

# 작동 확인

```funnylambda
.true(1)(2)   // → 1 
.false(1)(2)  // → 2 
```

<div v-click class="mt-8">

<code>if</code> 함수가 필요할까?

```funnylambda
if := b -> t -> f -> b(t)(f)
```

</div>

<div v-click class="mt-6 text-xl">
<strong>Church <code>Bool</code> 은 자기 자신이 <code>ifelse</code> 다.</strong>
</div>

---
---

# 보너스: 논리 연산도 그냥 적용

```funnylambda
and := a -> b -> a(b)(.false)
or  := a -> b -> a(.true)(b)
not := b -> b(.false)(.true)
```

<div class="mt-8 text-xl">
<code>and a b</code> = "만약 <code>a</code> 라면 <code>b</code> 를, 아니면 <code>.false</code> 를."
</div>

<div class="mt-6 opacity-70 text-sm">
논리 연산이 추가 언어 기능 없이, <em>이미 있는 도구</em>로 표현된다.
</div>

---
---

# 무언가 익숙하지 않은가?

```funnylambda
// 원본 ADT 버전 
match b {
  .true  -> t,
  .false -> f
}
```

```funnylambda
// 인코딩 후 
b(t)(f)
```

<div v-click class="mt-8 text-2xl text-center">
두 줄은 <strong>같은 모양</strong>이다.
</div>

---
---

# `match` 는 <em>적용</em>의 설탕이다

<div class="text-2xl mt-8 space-y-6">

<div>각 변형에 핸들러를 하나씩 주고,</div>
<div>그 값이 <strong>자기 분기</strong>를 고른다.</div>

</div>

<div v-click class="mt-12 text-xl opacity-80">
컴파일러가 <code>match</code> 로 대신 해주던 일 = 방금 우리가 손으로 한 일.
</div>

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
