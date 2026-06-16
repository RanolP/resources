import { L, shikiControlledMove } from 'shiki-controlled-move'
import { funnylambda } from '../setup/shiki-grammar.js'

const PairDerivation = shikiControlledMove(funnylambda as any)`
data Pair[A, B] = .pair(A, B)
pair = a -> b -> .pair(a, b)

fst = .pair(a, b) -> a
snd = .pair(a, b) -> b

fst(pair(1)(2))
`
  // S1: map line folds in
  .step(
    L[5].insertAfter('map = p -> f -> f(p)'),
    L[6].insertAfter(''),
  )
  // S2: fst parks → map(pair(1)(2))(fst)
  .step(
    L[8]('fst(pair(').foldTo('map(pair('),
    L[8]('))').foldTo('))(fst)'),
  )
  // S3: compose line folds in
  .step(
    L[6].insertAfter('map∘pair = a -> b -> f -> map(pair(a)(b))(f)'),
  )
  // S4: ( → ∘, outer ) removed → map∘pair(1)(2)(fst)
  .step(
    L[9]('map(pair(').foldTo('map∘pair('),
    L[9]('))(fst)').foldTo(')(fst)'),
  )
  // S5: fst/snd lambda style, map → map′ everywhere
  .step(
    L[3]('.pair').delete(),
    L[3]('(a, b) -> a').foldTo('a -> a'),
    L[4]('.pair').delete(),
    L[4]('(a, b) -> b').foldTo('a -> b'),
    L[6]('map = p -> f -> f(p)').foldTo('map′ = .pair(a, b) -> f -> f(a)(b)'),
    L[7]('map∘pair = a -> b -> f -> map(pair(a)(b))(f)').foldTo('map′∘pair = a -> b -> f -> map(pair(a)(b))(f)'),
    L[9]('map∘pair(').foldTo('map′∘pair('),
  )
  // S6: pair line removed, compose body uses .pair
  .step(
    L[1].delete(),
    L[6]('map′∘pair = a -> b -> f -> map(pair(a)(b))(f)').foldTo('map′∘pair = a -> b -> f -> map(.pair(a, b))(f)'),
  )
  // S7: data line removed, compose body simplifies to f(a)(b)
  .step(
    L[0].delete(),
    L[5]('map′∘pair = a -> b -> f -> map(.pair(a, b))(f)').foldTo('map′∘pair = a -> b -> f -> map(a)(b)(f)'),
  )

export default PairDerivation.component
