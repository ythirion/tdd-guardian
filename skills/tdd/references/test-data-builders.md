# Test Data Builders and Object Mothers

**Why**: the Arrange should only show what matters for this test. Building domain objects with
constructors in every test spreads their signature everywhere: when `Address` gains a parameter,
every test that builds one breaks. The builder is the only place that knows the constructor.

## Rules

- One builder per aggregate or command, in the builders folder (`testSupportPatterns`), named `<Thing>Builder`.
- A static entry point in business language: `UnePartieDeChasseDuBouchonnois()`, `anOrder()`.
- **Sensible defaults for everything**: `build()` with no configuration returns a valid object.
  A test only sets what it is about.
- Fluent methods named after the domain, not after fields: `SurUnTerrainSansGalinettes()`,
  `SansBalles()`, `worth(60)`, `shippedTo('BE')`. Avoid `WithNbGalinettes(0)`.
- Nested builders configured through a lambda: `.WithPostalCode(_ => _.WithNumber("1 Bis"))`.
- **Object Mothers** for the recurring characters, as static factories returning builders, so a test
  can still tweak them: `Bernard().SansBalles()`.
- Shared names in constants (`Chasseurs.Bernard`) so Act and Assert refer to the same value.
- No logic and no assertion in a builder; `build()` just calls the constructor.
- **Generate the builder from usage**: write in the test the line you wish you could read, then
  create the missing methods (in RED, test support is writable). Never design a builder upfront.

## Before / after

```csharp
// Before: 9 lines of noise, every constructor exposed
var id = Guid.NewGuid();
var repository = new PartieDeChasseRepositoryForTests();
repository.Add(new PartieDeChasse(id, new Terrain("Pitibon sur Sauldre") { NbGalinettes = 3 },
[
    new("Dédé") { BallesRestantes = 20 },
    new("Bernard") { BallesRestantes = 8 },
    new("Robert") { BallesRestantes = 12 }
]));
var service = new PartieDeChasseService(repository, () => DateTime.Now);

// After: only what matters
var partieDeChasse = AvecUnePartieDeChasseExistante(
    UnePartieDeChasseDuBouchonnois()
        .SurUnTerrainRicheEnGalinettes()
        .Avec(Dédé(), Bernard(), Robert())
);
```

```csharp
public class ChasseurBuilder
{
    private readonly string _nom;
    private int _ballesRestantes;

    private ChasseurBuilder(string nom, int ballesRestantes) { _nom = nom; _ballesRestantes = ballesRestantes; }

    // Object Mothers
    public static ChasseurBuilder Dédé() => new(Chasseurs.Dédé, ballesRestantes: 20);
    public static ChasseurBuilder Bernard() => new(Chasseurs.Bernard, ballesRestantes: 8);

    public ChasseurBuilder SansBalles() { _ballesRestantes = 0; return this; }

    public Chasseur Build() => new(_nom) { BallesRestantes = _ballesRestantes };
}
```

## TypeScript

```ts
export const anOrder = () => new OrderBuilder()

class OrderBuilder {
  private lines: OrderLine[] = [aBook().build()]
  private country = 'FR'

  shippedTo(country: string) { this.country = country; return this }
  withoutLines() { this.lines = []; return this }
  worth(amount: number) { this.lines = [aBook().pricedAt(amount).build()]; return this }

  build(): Order { return new Order(randomUUID(), this.lines, this.country) }
}

const order = anOrder().worth(60).shippedTo('BE').build()
```
