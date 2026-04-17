---
theme: seriph
title: FUN을 위한 대수적 자료형 — Church Encoding 입문
info: |
  Algebraic Data Type for FUN: An Introduction to Church Encoding.
  A 20-minute meetup talk.
class: text-center
transition: slide-left
mdc: true
fonts:
  sans: 'Inter, Noto Sans KR'
  serif: 'Cormorant Garamond, Noto Serif KR'
  mono: 'JetBrains Mono, Noto Sans KR'
---

# FUN을 위한<br/>대수적 자료형

## Church Encoding 입문

<div class="pt-8 opacity-60 text-lg">
  FUN = <strong>FUN</strong>ctions + <strong>FUN</strong>ny
</div>

<div class="pt-16 opacity-40">
  <kbd>space</kbd> 로 시작 →
</div>

---
layout: default
class: text-left
---

# 만약 당신의 언어에…

<div class="text-2xl space-y-4 mt-8">

- `if` 가 없다면?
- `enum` 이 없다면?
- `match` 가 없다면?

</div>

<div v-click class="mt-12 text-2xl">
오늘, 이 모든 것을 <strong>함수만으로</strong> 다시 만들어봅니다.
</div>

---
---

# `Bool` — 가장 단순한 합

```ocaml
data Bool = .true + .false
```

```ocaml
match b {
  .true  -> "yes",
  .false -> "no"
}
```

<div class="mt-6 opacity-70">
변형(variant)이 둘. 생성자는 인자 없음.
</div>

---
---

# `Maybe` — 있을 수도, 없을 수도

```ocaml
data Maybe[A] = .none + .some(A)
```

```ocaml
match m {
  .none    -> 0,
  .some(x) -> x + 1
}
```

<div class="mt-6 opacity-70">
<code>.some</code> 은 <code>A</code> 하나를 담는 생성자 — nullable 의 타입 안전 버전.
</div>

---
---

# `Pair` — 곱

```ocaml
data Pair[A, B] = .pair(A, B)
```

변형은 하나뿐, 그러나 필드는 둘.

<div class="mt-8 text-xl">
<strong>sum</strong>(<code>+</code>) 과 <strong>product</strong>(<code>,</code>) 의 조합 = <em>Algebraic</em> Data Type.
</div>

---
---

# 람다 방언 — 표기법

```ocaml
(* 람다: 괄호 없음 *)
x -> x                (* 항등 *)
x -> y -> x           (* 커링이 기본 *)

(* 적용: 항상 커리 *)
f(x)
f(x)(y)               (* f 를 x 에 적용한 뒤, 그 결과를 y 에 적용 *)

(* let 은 설탕 *)
let id = x -> x in id(.zero)
(* ≡ *) (id -> id(.zero))(x -> x)
```

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

```ocaml
(* 두 선택지를 받아 하나를 반환하는 함수 *)

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

```ocaml
.true(1)(2)   (* → 1 *)
.false(1)(2)  (* → 2 *)
```

<div v-click class="mt-8">

<code>if</code> 함수가 필요할까?

```ocaml
if := b -> t -> f -> b(t)(f)
```

</div>

<div v-click class="mt-6 text-xl">
<strong>Church <code>Bool</code> 은 자기 자신이 <code>ifelse</code> 다.</strong>
</div>

---
---

# 보너스: 논리 연산도 그냥 적용

```ocaml
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

```ocaml
(* 원본 ADT 버전 *)
match b {
  .true  -> t,
  .false -> f
}
```

```ocaml
(* 인코딩 후 *)
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

```ocaml
data Maybe[A] = .none + .some(A)
```

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

**Encoding**
```ocaml
.none    := n -> s -> n
.some(a) := n -> s -> s(a)
```

</div>

<div>

**Eliminator**
```ocaml
match m {
  .none    -> d,
  .some(x) -> f(x)
}
(* ≡ *) m(d)(f)
```

</div>

</div>

---
---

# 투어 ②: `Pair` — 변형 하나, 필드 둘

```ocaml
data Pair[A, B] = .pair(A, B)
```

<div class="grid grid-cols-2 gap-6 mt-4">

<div>

**Encoding + Eliminator**
```ocaml
.pair(a)(b) := p -> p(a)(b)

match p { .pair(a, b) -> e }
(* ≡ *) p(a -> b -> e)
```

</div>

<div>

**사용**
```ocaml
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

```ocaml
data List[A] = .nil + .cons(A, List[A])
```

```ocaml
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
