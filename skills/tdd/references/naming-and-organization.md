# Naming and organization

## One test class per use case or behaviour

Named after it in the domain language: `TirerSurUneGalinette`, `DemarrerUnePartieDeChasse`,
`PlaceAnOrder`. Not `PartieDeChasseServiceTests` with hundreds of lines.

## Test names: context and outcome, in business language

The class (or `describe`) gives the action, the test gives the situation, so the pair reads as a
sentence: `TirerSurUneGalinette.AvecUnChasseurAyantDesBallesEtAssezDeGalinettesSurLeTerrain`,
`describe('Place an order')` + `it('ships an order worth 60 euros free of charge')`.

- **Failures start with `Fails` (or `Echoue`)** and give the business reason:
  `EchoueAvecUnChasseurNayantPlusDeBalles`, `fails when the basket is empty`.
- Use the language of the domain experts, even when the code is in English elsewhere; accents are
  fine where the language allows them.
- Avoid: `Test1`, `ShouldThrowException`, `TirerSurUneGalinette_Works`,
  `When_NbGalinettes_Is_0_Then_Throws`, `calls repository.save`.

## A shared base class (or setup module) for the fixture

It holds the Fakes, a fixed clock, the system under test and helpers in business language. No setup
logic inside test methods beyond calling builders.

```csharp
public abstract class PartieDeChasseServiceTest
{
    protected static readonly DateTime Now = new(2024, 6, 6, 14, 50, 45, DateTimeKind.Utc);
    private static readonly Func<DateTime> TimeProvider = () => Now;

    protected readonly PartieDeChasseRepositoryForTests Repository = new();
    protected readonly PartieDeChasseService PartieDeChasseService;

    protected PartieDeChasseServiceTest() => PartieDeChasseService = new(Repository, TimeProvider);

    protected PartieDeChasse AvecUnePartieDeChasseExistante(PartieDeChasseBuilder builder)
    {
        var partieDeChasse = builder.Build();
        Repository.Add(partieDeChasse);
        return partieDeChasse;
    }
}

public class TirerSurUneGalinette : PartieDeChasseServiceTest
{
    [Fact] public void AvecUnChasseurAyantDesBallesEtAssezDeGalinettesSurLeTerrain() { … }
    [Fact] public void EchoueAvecUnChasseurNayantPlusDeBalles() { … }
    [Fact] public void EchoueCarPasDeGalinetteSurLeTerrain() { … }
}
```

## Folders by role

`Unit/<Module>/` for test classes, `Builders/`, `Assertions/`, `Doubles/` (Fakes), `Acceptance/`.
Approval files (`*.verified.txt`) stay next to their test. Map them in `.tdd/config.json`
(`testSupportPatterns`, `fakePatterns`, `acceptanceTestPatterns`).

## Layout of a test

- Arrange / Act / Assert separated by one blank line, no comments needed.
- The Act is one line. A lambda capturing the Act is named after the business action:
  `var tirerSansBalle = () => …`.
- Time, ids and randomness are injected and fixed (`Now`, `() => Now`).
