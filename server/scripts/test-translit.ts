import { buildLatinIndex, _internals } from '../src/utils/translit';

const cases: Array<{ name: string; queries: string[] }> = [
  { name: 'હિરલકુમાર રમેશભાઈ પટેલ', queries: ['hiral', 'kumar', 'ramesh', 'patel', 'rameshbhai'] },
  { name: 'ભાઈલાલભાઈ', queries: ['bhailal', 'bhai', 'lal'] },
  { name: 'બ્રિજેશકુમાર વિનોદભાઈ પટેલ', queries: ['brijesh', 'vinod', 'patel', 'kumar'] },
  { name: 'મનીષાબેન', queries: ['manisha', 'manishaben', 'ben'] },
  { name: 'જગદીશભાઈ દાજીભાઈ પટેલ', queries: ['jagdish', 'jagdishbhai', 'daji'] },
  { name: 'અંકુરકુમાર', queries: ['ankur', 'ankurkumar'] },
  { name: 'ચિરાગકુમાર', queries: ['chirag', 'chiragkumar'] },
  { name: 'Dhvani Alpeshkumar Patel', queries: ['dhvani', 'patel'] },
];

console.log('Form: A = anglicized, V = verbose, I = index (concatenated)\n');
for (const c of cases) {
  const a = _internals.anglicized(c.name);
  const v = _internals.verbose(c.name);
  const idx = buildLatinIndex(c.name).toLowerCase();
  console.log(`${c.name}`);
  console.log(`  A: ${a}`);
  console.log(`  V: ${v}`);
  for (const q of c.queries) {
    const hit = idx.includes(q.toLowerCase());
    console.log(`  q "${q}" → ${hit ? '✓ match' : '✗ MISS'}`);
  }
  console.log('');
}
