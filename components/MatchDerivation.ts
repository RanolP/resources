import { L, shikiControlledMove } from 'shiki-controlled-move'
import { funnylambda } from '../setup/shiki-grammar.js'

// "Derive `if` from `match`", then β-reduce `if (true) (1) (0)`, as one scm builder.
//
// The story names each arm's church encoding (`true`/`false`), collapses the match into the
// identity dispatch `if = cond -> cond`, then inlines `true` and β-reduces the application
// down to `1`. Lines are inserted (the `true =`/`false =` defs) and deleted (the match block),
// so indices shift between steps — see the per-step notes for the live layout at each point.
const MatchDerivation = shikiControlledMove(funnylambda as any)`
if = cond -> then -> otherwise ->
  match cond {
    .true => then,
    .false => otherwise,
  }

// if (true) { 1 } else { 0 }
   if (true) ( 1 )      ( 0 )
`
  // 1. inline — push the `if` binders into each arm body: `.true` takes a COPY (needed once
  //    more for `.false`), `.false` takes the L0 originals via MOVE, collapsing L0 to
  //    `if = cond ->`. A space is inserted after each `=>` since the copied span has none.
  .step(
    L[0]('then -> otherwise ->').copyTo(L[2]('.true =>').after()),
    L[2]('.true =>').after().insert(' '),
    L[0]('then -> otherwise ->').moveTo(L[3]('.false =>').after()),
    L[3]('.false =>').after().insert(' '),
  )
  // 2. name the arms — insert a `true =` / `false =` def line below the block, glide each arm
  //    body DOWN into its def, then fold the arm to just its name. (A trailing blank line is
  //    added so the usage block keeps its breathing room.) Live layout after this step:
  //    L0 if-sig, L1 match{, L2 .true=>true, L3 .false=>false, L4 }, L5 blank,
  //    L6 true=…, L7 false=…, L8 blank, L9 comment, L10 usage.
  .step(
    L[5].insertLineAfter('true = '),
    L[2]('then -> otherwise -> then').copyTo(L[6]('true = ').after()),
    L[2]('then -> otherwise -> then').foldTo('true'),
    L[6].insertLineAfter('false = '),
    L[3]('then -> otherwise -> otherwise').copyTo(L[7]('false = ').after()),
    L[3]('then -> otherwise -> otherwise').foldTo('false'),
    L[7].insertLineAfter(''),
  )
  // 3. collapse the match — `match cond { .true => true, .false => false }` ≡ `cond`, so move
  //    `cond` up into the signature (`if = cond -> cond`) and delete the four match lines.
  //    Deleting L1 four times removes L1–L4 in turn. After this: L0 if-sig, L1 blank,
  //    L2 true=…, L3 false=…, L4 blank, L5 comment, L6 usage.
  .step(
    L[0]('->').after().insert(' '),
    L[1]('cond').moveTo(L[0]('-> ').after()),
    L[1].delete(),
    L[1].delete(),
    L[1].delete(),
    L[1].delete(),
  )
  // 4. reduce-if — strip `if (` and its matching `)` so `if (true)` becomes `true`.
  .step(
    L[6]('if (').delete(),
    L[6](')', 0).delete(),
  )
  // 5. subst `true` — glide the `true =` def body UP into the usage line, wrapped in its own
  //    `(` / `)`, then drop the `true` token ⇒ `(then -> otherwise -> then) ( 1 )      ( 0 )`.
  .step(
    L[2]('then -> otherwise -> then').copyTo(L[6]('true').before()),
    L[6]('then -> otherwise -> then').before().insert('('),
    L[6]('then -> otherwise -> then').after().insert(')'),
    L[6]('true').delete(),
  )
  // 6. apply 1 — β-reduce `then := 1`: copy `1` onto the binder, move it onto the body use,
  //    delete both `then`s and the now-empty application ⇒ `(1 -> otherwise -> 1)( 0 )`.
  .step(
    L[6]('1').copyTo(L[6]('then', 0).before()),
    L[6]('1', 1).moveTo(L[6]('then', 1).before()),
    L[6]('then').delete(),
    L[6](' (  )      ').delete(),
  )
  // 7. apply 0 — β-reduce `otherwise := 0` (drops the unused arg) ⇒ `1`.
  .step(
    L[6]('(1 -> otherwise -> 1)( 0 )').foldTo('1'),
  )

export default MatchDerivation.component
