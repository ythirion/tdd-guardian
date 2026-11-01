# Business assertions

**Why**: a block of `Check.That(x.Y).IsEqualTo(…)` is a technical checklist the reader has to
translate. A named assertion states the expected outcome in the domain language, and its name shows
up in the failure stack trace (`at PartieDeChasseAssertions.ContientLeChasseurAvec(...)`), so the
failure is understood without reading the test.

## Rules

- Extension methods (or small functions) on the domain object, grouped per aggregate in the
  assertions folder (`testSupportPatterns`).
- **Named in the domain language**, not in tester language: `ContientLeChasseurAvec`,
  `AÉmisLÉvénement`, `isShippedFreeOfCharge`. `ShouldHave…` is a first step, not the target.
- Each returns the object, so assertions chain and read as one sentence.
- Inside, plain library assertions; no conditional logic, no loop that hides what is checked.
- Assert on the outcome that matters for the behaviour, **including the side effects the business
  requires** (the event that gives traceability, the save), not on every field.
- For failing paths, assert both the business error and what must or must not have been saved.
- When the whole output is the point (a report, a big aggregate), prefer an approval test (`Verify`).
- Declare their names in `assertionMethodPatterns` (e.g. `"\\.(should|contient|aÉmis|is|has)\\w*\\("`) so
  that extracting them in REFACTOR does not lower the assertion count `tdd.js next` compares.

```csharp
public static class PartieDeChasseAssertions
{
    public static PartieDeChasse AÉmisLÉvénement(this PartieDeChasse partieDeChasse, DateTime expectedTime, string expectedMessage)
    {
        Check.That(partieDeChasse.Events).HasSize(1);
        Check.That(partieDeChasse.Events[0]).IsEqualTo(new Event(expectedTime, expectedMessage));
        return partieDeChasse;
    }

    public static PartieDeChasse ContientLeChasseurAvec(this PartieDeChasse partieDeChasse, string nom, int ballesRestantes, int galinettes)
    {
        var chasseur = partieDeChasse.Chasseurs.Single(c => c.Nom == nom);
        Check.That(chasseur.BallesRestantes).IsEqualTo(ballesRestantes);
        Check.That(chasseur.NbGalinettes).IsEqualTo(galinettes);
        return partieDeChasse;
    }
}
```

A complete test following every rule, from 33 lines down to 8:

```csharp
[Fact]
public void EchoueAvecUnChasseurNayantPlusDeBalles()
{
    var partieDeChasse = AvecUnePartieDeChasseExistante(
        UnePartieDeChasseDuBouchonnois().SurUnTerrainRicheEnGalinettes().Avec(Dédé(), Bernard().SansBalles(), Robert()));

    var tirerSansBalle = () => PartieDeChasseService.TirerSurUneGalinette(partieDeChasse.Id, Chasseurs.Bernard);

    Check.ThatCode(tirerSansBalle).Throws<TasPlusDeBallesMonVieuxChasseALaMain>();
    Repository.SavedPartieDeChasse()!
        .AÉmisLÉvénement(Now, "Bernard veut tirer sur une galinette -> T'as plus de balles mon vieux, chasse à la main");
}
```

Without the event assertion this test stayed green when the traceability code was removed: a
failing-path test that does not check the business side effect is incomplete. `/tdd:mutate` finds them.

## TypeScript

```ts
export const theOrder = (order: Order) => ({
  isShippedFreeOfCharge() { expect(order.shippingFees).toEqual(Money.zero()); return this },
  hasEmitted(event: DomainEvent) { expect(order.events).toEqual([event]); return this },
})

theOrder(saved).isShippedFreeOfCharge().hasEmitted(new OrderPlaced(order.id, NOW))
```
