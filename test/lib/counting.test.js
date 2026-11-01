'use strict'
const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { countTests, findDisablingMarkers, countAssertions } = require('../../scripts/lib/counting')

describe('Counting tests', () => {
  it('counts test declarations in JS, Java, C# and Python', () => {
    assert.equal(countTests(`describe('fees', () => {\n  it('is free above 50', () => {})\n  test('costs 5 below', () => {})\n})`), 2)
    assert.equal(countTests(`@Test\nvoid a() {}\n@Test\nvoid b() {}`), 2)
    assert.equal(countTests(`[Fact]\npublic void A() {}\n[Theory]\n[InlineData(1)]\npublic void B(int x) {}`), 2)
    assert.equal(countTests(`def test_free():\n    pass\n\ndef helper():\n    pass`), 1)
    assert.equal(countTests(`const submit = () => {}\nsplit(x)`), 0)
  })
  it('counts a property as one test, whatever the number of generated runs', () => {
    assert.equal(countTests(`it('every multiple of 15 is FizzBuzz', () => {\n  fc.assert(fc.property(fc.integer(), (n) => fizzbuzz(15 * n) === 'FizzBuzz'))\n})`), 1)
    assert.equal(countTests(`[Property]\npublic Property SurNImporteQuelTerrainSansGalinettesLaPartieNeDémarrePas() => Prop.ForAll(...);`), 1)
    assert.equal(countTests(`@given(st.integers())\ndef test_round_trip(n):\n    assert parse(format(n)) == n`), 1)
  })
  it('finds the markers that disable a test, in every framework', () => {
    for (const marker of ["it.skip('x'", "test.skip('x'", "describe.skip('x'", "xit('x'", "xdescribe('x'", '@Disabled', '@Ignore',
      '@pytest.mark.skip', '[Ignore]', '[Fact(Skip = "later")]']) {
      assert.deepEqual(findDisablingMarkers(marker).length, 1, marker)
    }
    assert.deepEqual(findDisablingMarkers(`it('skips the empty basket', () => {})\nconst skipped = 0`), [])
  })
  it('counts assertions, including business assertions matching assertionMethodPatterns, once each', () => {
    const businessAssertions = ['\\.(should|contient|aÉmis)\\w*\\(', '\\bexpect\\(']

    assert.equal(countAssertions(`expect(fees).toEqual(0)\nassert.equal(a, b)\nassertThat(x).isTrue()`), 3)
    assert.equal(countAssertions(`Check.That(c.Balles).IsEqualTo(7);\nCheck.ThatCode(tirer).Throws<E>();\nAssert.Equal(1, x);`), 3)
    assert.equal(countAssertions(`    assert parse(format(n)) == n`), 1)
    assert.equal(countAssertions(
      `Repository.SavedPartieDeChasse()!\n  .ContientLeChasseurAvec(Bernard, 7, 1)\n  .ContientLesGalinettes(2)\n  .AÉmisLÉvénement(Now, "x");\nexpect(y)`,
      businessAssertions), 4)
  })
})
