import { L, shikiControlledMove } from 'shiki-controlled-move'
import { funnylambda } from '../setup/shiki-grammar.js'

const SumTypeAnim = shikiControlledMove(funnylambda as any)`
data Maybe[A] = .none + .some(A)

.none    := n -> s -> n
.some(a) := n -> s -> s(a)
`
  .step(
    L('.none').foldTo('none-handler'),
    L('.some(a)').foldTo('some-handler'),
  )
  .step(
    L('none-handler').foldTo('n -> s -> n'),
    L('some-handler').foldTo('n -> s -> s(a)'),
  )

export default SumTypeAnim.component
