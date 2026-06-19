import { L, shikiControlledMove } from 'shiki-controlled-move'
import { funnylambda } from '../setup/shiki-grammar.js'

const PairDerivation = shikiControlledMove(funnylambda as any)`
data Pair[A, B] = .pair(A, B)
pair = a -> b -> .pair(a, b)

fst = .pair(a, b) -> a
snd = .pair(a, b) -> b

fst(pair(1)(2))
`
  .step(
    L[5].insertLineAfter('map = p -> f -> f(p)'),
    L[6].insertLineAfter(''),
  )
  .step(
    L[8]("(pair").before().insert('map'),
    L[8]('fst').moveTo(L[8]('))').after()),
    L[8]('fst').before().insert('('),
    L[8]('fst').after().insert(')'),
  )
  .step(
    L[6].insertLineAfter('map∘pair = a -> b -> f -> map(pair(a)(b))(f)'),
  )
  .step(
    L[9]('map(pair(').focus('(').foldTo('∘'),
    L[9]('))(fst)').focus(')', 0).delete(),
  )
  .step(
    L[3]('.pair(').delete(),
    L[3](',').foldTo(' ->'),
    L[3](')').delete(),
    L[4]('.pair(').delete(),
    L[4](',').foldTo(' ->'),
    L[4](')').delete(),
    L[7]('pair(').delete(),
    L[7]('map', 1).delete(),
    L[7]('b))').focus(')', 0).delete(),
    L[7]('(f)').foldTo('f'),
    L[7]('f', 1).moveTo(L[7]('f -> ').after()),
  )
  .step(
    L[0].delete(),
    L[0].delete(),
    L[0].delete(),
    L[3].delete(),
  )

export default PairDerivation.component
