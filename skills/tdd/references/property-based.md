# Property-based testing, when necessary

An example is a point; a rule is a line. Example-based tests cover business conformity well and the
input space badly. Use a property when, and only when, the item states a rule that must hold for
every input of a family:

- invariants ("a game with at least one galinette and armed hunters always starts");
- failure rules over a range ("any terrain without galinettes, 0 or negative, refuses to start");
- algebraic laws (commutativity, associativity, identity, round trip `parse(format(x)) == x`, idempotence);
- an oracle exists (a simpler or legacy implementation to compare with).

Do not use a property when a single named example explains the behaviour better, when the rule only
exists for specific values, or when you would have to re-implement the production logic in the test.

## Rules

- **Properties complement examples, they do not replace them.** Keep one or two named examples.
- State the property in words first, in the test list, tagged `[property]`:
  `- [ ] [property] every multiple of 15 is FizzBuzz`.
- **Generators encode the preconditions**, live next to the builders, are named after the domain
  (`TerrainRicheEnGalinettesGenerator`), and generalise beyond the obvious boundary
  (`Gen.Choose(-1000, 0)` for "no galinettes", not only `0`).
- Failing paths are properties too: a helper checks the business exception and the saved state.
- The property name reads as the rule: `SurNImporteQuelTerrainSansGalinettesLaPartieNeDémarrePas`.
- When a property fails, keep the shrunk counter-example as a new named example test.
- In RED, **one property is one test** (the guard counts it once, whatever the number of runs).
  In GREEN, a property may demand a more general implementation than fake it.

## fast-check (TypeScript)

```ts
it('says FizzBuzz for every multiple of 15', () => {
  fc.assert(fc.property(fc.integer({ min: 1, max: 10_000 }), (n) => fizzbuzz(15 * n) === 'FizzBuzz'))
})
```

## FsCheck (C#)

```csharp
private static Arbitrary<(string nom, int nbGalinettes)> TerrainSansGalinettesGenerator()
    => (from nom in NomGenerator()
        from nbGalinettes in Gen.Choose(-1000, 0) // generalise beyond 0
        select (nom, nbGalinettes)).ToArbitrary();

[Property]
public Property SurNImporteQuelTerrainSansGalinettesLaPartieNeDémarrePas()
    => Prop.ForAll(TerrainSansGalinettesGenerator(), GroupeDeChasseursArmésGenerator(),
        (terrain, chasseurs) => MustFailWith<ImpossibleDeDémarrerUnePartieSansGalinettes>(
            () => PartieDeChasseService.Demarrer(terrain, chasseurs),
            savedPartieDeChasse => savedPartieDeChasse == null));
```

Libraries: FsCheck (C#, F#), fast-check (JS/TS), jqwik (Java), Hypothesis (Python).
