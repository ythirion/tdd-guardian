# “tdd-guardian” Claude Code plugin

## Context and goal

tdd-guard is a Claude Code plugin that enforces the Red-Green-Refactor cycle on the agent instead of merely asking for it. A skill describes the process; hooks enforce it by blocking forbidden writes for the current phase. It supports two modes, inside-out and outside-in, chosen per feature.

Problems it targets, as observed with coding agents:

- tautological tests, written together with the code they validate;
- tests edited, assertions weakened or `skip` added to get to green;
- several tests written at once, then all the code;
- refactoring skipped as soon as the suite is green;
- over-mocking, which couples tests to implementation details.

Non-negotiable principles:

1. A test list exists before the first test, and a human approves it.
2. One test at a time. It is seen failing, for the right reason, before any production code is written.
3. In the green phase, tests are read-only. Minimal code is enough (fake it, triangulation, Transformation Priority Premise).
4. Refactoring is a phase of its own, green before and after.
5. Tests describe behaviour through public interfaces.
6. The plugin is a teaching aid: every block explains the rule that was broken and the expected practice.

## Modes: inside-out and outside-in

The mode is set by `/tdd:start <feature> --mode inside-out|outside-in` (default from config) and can only change in OFF or LIST.

|  | Inside-out | Outside-in |
| --- | --- | --- |
| Starting point | Domain core: rules, value objects, entities | A failing acceptance test at the system boundary (use case, API) |
| Loops | One loop: unit Red-Green-Refactor | Double loop: an outer acceptance test stays red while inner unit cycles drive towards it |
| Test list | Unit cases, ordered from core rules to outer layers | Acceptance scenarios, each one expanded into unit items as collaborators are discovered |
| Collaborators | Real objects; already built from the core outwards | Discovered from the outside; each new role becomes a port (interface) |
| Test doubles | Rarely needed; default policy `allow` | Fakes preferred over mocks; default policy `justify` |
| Done when | Every list item is ticked | Every acceptance scenario is green and every unit item ticked |

### Fakes over mocks (outside-in)

In outside-in mode, a collaborator at an infrastructure boundary (repository, clock, id generator, message bus, email sender, external API) is replaced by a **Fake**: a small, working, in-memory implementation of the port, written once and reused across tests. Tests then assert on state and outcomes (“the order is in the repository”, “one email was sent to X”), not on calls.

- Fakes live in `fakePatterns` (default `test/fakes/**`) and are test code: written in RED, read-only in GREEN.
- A Fake must honour the port's contract. When the real adapter is built, a shared contract test suite runs against both the Fake and the adapter.
- Stubs returning canned values are tolerated for simple queries; interaction mocks (`jest.fn` with call assertions, `Mockito.verify`, `MagicMock.assert_called_with`) are the exception.
- Under `mockPolicy: justify`, a mocking-library call in new test code is blocked unless the line carries `tdd-guard: allow-mock <reason>`. Justified mocks are logged in `state.json` and listed by `/tdd:status` for review.

## Architecture

The plugin follows the standard Claude Code plugin layout. Hook scripts are Node.js (≥ 18) with no external dependency, so they run on macOS, Linux and Windows.

```
tdd-guard/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── tdd/
│       ├── SKILL.md
│       └── references/
│           ├── cycle.md          # Red-Green-Refactor, baby steps
│           ├── green-moves.md    # fake it, triangulation, TPP
│           ├── inside-out.md     # core first, ordering the list
│           ├── outside-in.md     # double loop, ports discovery
│           ├── fakes.md          # writing Fakes, contract tests
│           ├── naming-and-organization.md  # test names, one class per use case
│           ├── test-data-builders.md       # builders, Object Mothers
│           ├── business-assertions.md      # assertions in the domain language
│           └── property-based.md           # when and how to write properties
├── agents/
│   ├── tdd-tester.md
│   ├── tdd-implementer.md
│   └── tdd-refactorer.md
├── commands/
│   └── tdd/
│       ├── start.md
│       ├── approve.md
│       ├── next.md
│       ├── status.md
│       ├── mutate.md
│       └── off.md
├── hooks/
│   └── hooks.json
├── scripts/
│   ├── lib/                   # state, config, globs, runners, mock detection
│   ├── guard-write.js         # PreToolUse
│   ├── guard-bash.js          # PreToolUse on Bash
│   ├── check-stop.js          # Stop
│   ├── session-start.js       # SessionStart
│   └── tdd.js                 # phase transition CLI
├── test/                      # the plugin's own tests
├── examples/                  # one kata per mode
└── README.md
```

Paths in `hooks.json` use `${CLAUDE_PLUGIN_ROOT}`. Check the exact `plugin.json` and `hooks.json` formats against the Claude Code documentation at implementation time.

## State machine

The plugin has six phases. Every transition checks an exit condition, two of them require a human, and the ACCEPTANCE phase only exists in outside-in mode.

&#91;embedded content: state machine · 6 phases, 2 modes\]

Conditions checked by `tdd.js next`. “Unit suite” means `testCommand`, which excludes acceptance tests; the acceptance suite runs through `acceptanceCommand`.

| Transition | Mode | Conditions |
| --- | --- | --- |
| LIST → ACCEPTANCE | outside-in | test list approved by a human (`/tdd:approve`) |
| LIST → RED | inside-out | test list approved by a human (`/tdd:approve`) |
| ACCEPTANCE → RED | outside-in | exactly one new acceptance test; it fails (a compile error is accepted at this level) |
| RED → GREEN | both | exactly one new unit test; it is the only failing unit test |
| GREEN → REFACTOR | both | unit suite green; hash of test, Fake and test support files identical to the one taken on entering GREEN |
| REFACTOR → RED | both | unit suite green; assertion count ≥ the one on entering REFACTOR; current item ticked; inside-out: items left / outside-in: acceptance test still red |
| REFACTOR → ACCEPTANCE | outside-in | as above, and the current acceptance test is green with scenarios left |
| REFACTOR → OFF | both | as above, and nothing is left: every item ticked, every scenario green |

The test-file hash is the main anti-cheating safeguard: even a bypass of the hooks is caught when leaving GREEN.

State persisted in `.tdd/state.json`:

```json
{
  "mode": "outside-in",
  "phase": "GREEN",
  "feature": "shipping fees",
  "acceptanceTest": "test/acceptance/shipping.test.ts",
  "currentTest": "free shipping above 50 euros",
  "unitTestCountAtRed": 12,
  "testFilesHashAtGreen": "sha256:…",
  "assertionCountAtRefactor": 34,
  "justifiedMocks": [
    { "file": "test/notify.test.ts", "line": 18, "reason": "third-party SDK with no port" }
  ],
  "touchedFiles": ["src/shipping.ts", "test/fakes/in-memory-orders.ts"],
  "lastRun": { "unitGreen": false, "acceptanceGreen": false, "at": "2026-11-01T10:12:00Z" }
}
```

## Project configuration

Each project declares its config in `.tdd/config.json`, created by `/tdd:start` when missing, with auto-detection offered to the human (`package.json`, `pom.xml`, `pyproject.toml`, `*.csproj`).

```json
{
  "defaultMode": "outside-in",
  "testCommand": "npm test --silent -- --testPathIgnorePatterns acceptance",
  "acceptanceCommand": "npm test --silent -- test/acceptance",
  "testFilePatterns": ["**/*.test.ts", "test/**"],
  "acceptanceTestPatterns": ["test/acceptance/**"],
  "fakePatterns": ["test/fakes/**"],
  "testSupportPatterns": ["test/builders/**", "test/assertions/**"],
  "assertionMethodPatterns": ["\\.(should|contient|aÉmis)\\w*\\(", "\\bexpect\\("],
  "sourceFilePatterns": ["src/**"],
  "freeFilePatterns": ["*.md", ".tdd/test-list.md", "docs/**"],
  "mockPolicy": { "inside-out": "allow", "outside-in": "justify" },
  "mockPatterns": ["jest\\.fn\\(", "jest\\.mock\\(", "vi\\.mock\\(", "sinon\\.(mock|stub)\\("],
  "mutationCommand": "npx stryker run",
  "commitOnGreen": false,
  "commitOnRefactor": true,
  "strict": true
}
```

| Key | Purpose |
| --- | --- |
| `defaultMode` | Mode used when `/tdd:start` gets no `--mode` |
| `testCommand` | Runs the unit suite only; exit code 0 = green |
| `acceptanceCommand` | Runs the acceptance suite (outside-in) |
| `testFilePatterns` / `acceptanceTestPatterns` | Unit and acceptance test files (globs) |
| `fakePatterns` | Fakes: test code, same rules as unit tests |
| `testSupportPatterns` | Test Data Builders, Object Mothers, business assertions, generators: test code, same rules as Fakes |
| `assertionMethodPatterns` | Regexes counting calls to custom business assertions as assertions, so extracting them in REFACTOR does not lower the assertion count |
| `sourceFilePatterns` | Production code |
| `freeFilePatterns` | Always writable, whatever the phase |
| `mockPolicy` | Per mode: `allow`, `justify` (mock needs an inline reason) or `forbid` |
| `mockPatterns` | Regexes for mocking-library calls; defaults shipped for Jest, Vitest, Sinon, Mockito, unittest.mock, Moq, NSubstitute |
| `mutationCommand` | Optional, used by `/tdd:mutate` |
| `commitOnGreen` / `commitOnRefactor` | Automatic git commit at the end of a phase |
| `strict` | `false` = warn instead of block (discovery mode for students) |

A file matching no pattern is treated as production code.

## Slash commands

Every phase transition goes through `scripts/tdd.js`. The agent never edits `.tdd/state.json` directly; the hooks forbid it.

| Command | Effect |
| --- | --- |
| `/tdd:start <feature> [--mode inside-out\|outside-in]` | Creates the config if needed, sets the mode, enters LIST and has the agent draft `.tdd/test-list.md` (unit items in inside-out, acceptance scenarios in outside-in) |
| `/tdd:approve` | Human only: approves the test list; goes to RED (inside-out) or ACCEPTANCE (outside-in) |
| `/tdd:next` | Moves one phase forward if the exit conditions are met, otherwise explains why |
| `/tdd:status` | Shows mode, phase, current test, acceptance test, ticked list, last run, justified mocks |
| `/tdd:mutate` | Runs mutation testing on the files touched during the session |
| `/tdd:off` | Human only: goes to OFF after confirmation |

The agent may call `node scripts/tdd.js next` through the Bash tool to chain cycles: the script checks the exit conditions itself. `approve` and `off` are reserved for the human. The slash commands run them through the commands' built-in bash execution (`!` prefix), which does not go through the Bash tool, so `guard-bash.js` blocks any call to `tdd.js approve|off` made by the agent. Check this mechanism against the slash command documentation.

## TDD skill

`skills/tdd/SKILL.md` describes the process; every rule the hooks enforce is also explained there.

Frontmatter: the `description` must trigger the skill on “TDD”, “test first”, “red green refactor”, “inside-out”, “outside-in”, “build a feature with tests”, and whenever `.tdd/state.json` exists with a phase other than OFF.

Expected SKILL.md content (under 200 lines, details in `references/`):

1. Read `.tdd/state.json` and `.tdd/test-list.md` before any action, and load the reference for the current mode.
2. LIST, inside-out: list unit cases in business language, from the core rules outwards, simplest first. Outside-in: list acceptance scenarios (Given/When/Then). Tag an item `[property]` when it states a rule over a range of inputs rather than one example (see “Property-based testing, when necessary”). No code. Stop and ask for `/tdd:approve`.
3. ACCEPTANCE (outside-in): write one acceptance test for the next scenario, at the use case or API boundary, wiring Fakes for every infrastructure port. Run it, check it fails, then `tdd.js next`.
4. RED: write exactly one unit test, the simplest unticked item. In outside-in, start from the outermost unit the acceptance test needs; when a new collaborator role appears, name its port, write or extend its Fake, and add the collaborator's own items to the list. Check the test fails for the expected reason, then `tdd.js next`. The test follows the test design guidelines: business name, one class per use case, Arrange through builders, Assert through business assertions; a missing builder method or assertion is written now, from the usage in the test (generate code from usage).
5. GREEN: minimal code. Prefer fake it, then triangulate on the next test. Never touch tests or Fakes. Then `tdd.js next`.
6. REFACTOR: remove duplication, name, extract, apply the project's rules. Refactor the tests too: an Arrange longer than about five lines becomes a builder, a group of technical assertions on one object becomes a business assertion, a repeated literal becomes an Object Mother or a constant. Green after every change. Tick the item, then `tdd.js next`.
7. A new case appears: add it to the list, do not implement it.
8. Blocked by a hook: read the message, never try to work around it, ask the human if needed.

`references/outside-in.md` covers the double loop and port discovery. `references/fakes.md` covers how to write a Fake (smallest working in-memory implementation, inspection helpers such as `sentEmails()`, no assertions inside the Fake), when a mock is still acceptable, and the shared contract test pattern for Fake and real adapter. `references/inside-out.md` covers ordering the list from the core and when to add a final integration test. `references/naming-and-organization.md`, `references/test-data-builders.md`, `references/business-assertions.md` and `references/property-based.md` carry the guidelines and examples of the next section.

## Test design guidelines

The hooks make sure tests are written first; these guidelines make sure the tests are worth writing. They are the author's opinion on what a good test looks like, taken from the talk “Le bon chasseur, le mauvais chasseur, et le bon test” and its workshop (the Bouchonnois kata, C#, xUnit, NFluent, FsCheck, Verify). The skill teaches them, `tdd-tester` and `tdd-refactorer` apply them, and the plugin ships them as references with the examples below. Hooks do not enforce them (no AST analysis in v1), except where noted.

Four precepts drive every rule:

1. **A good test does not lie**: it turns red when the behaviour it covers breaks. Mutation testing checks it.
2. **A good test is read in five seconds**: it removes what is irrelevant and amplifies what matters.
3. **A good test covers what you did not think of testing**: when a rule holds over a range of inputs, a property says so.
4. **A good test protects the architecture**: covered by the outside-in mode and the Fakes above.

### Naming and organization

- **One test class per use case or behaviour**, named after it in the domain language: `TirerSurUneGalinette`, `DemarrerUnePartieDeChasse`, `PrendreLApéro`. Not `PartieDeChasseServiceTests` with hundreds of lines.
- **Test method names describe the context and the outcome, in business language**, never the method under test or the technical expectation. The class gives the action, the method gives the situation, so the pair reads as a sentence: `TirerSurUneGalinette.AvecUnChasseurAyantDesBallesEtAssezDeGalinettesSurLeTerrain`.
- **Failures start with `Echoue`** (or `Fails` in English codebases) and state the business reason: `EchoueAvecUnChasseurNayantPlusDeBalles`, `EchoueCarPasDeGalinetteSurLeTerrain`.
- Write names in the language of the domain experts, even when the code is in English elsewhere; accents are fine where the language allows them.
- **A shared abstract base class** holds the fixture: Fakes, a fixed clock, the system under test, and helpers in business language (`AvecUnePartieDeChasseExistante`). No setup logic inside test methods beyond calling builders.
- **Folders by role**: `Unit/<Module>/` for test classes, `Builders/`, `Assertions/`, `Doubles/` (Fakes), `Acceptance/`. Approval files (`*.verified.txt`) stay next to their test.
- **Arrange / Act / Assert separated by one blank line**, no comments needed. The Act is one line. A lambda that captures the Act is named after the business action (`var tirerSansBalle = () => …`).
- **Time, ids and randomness are injected** and fixed in tests (`Now`, `() => Now`).

Avoid names like `Test1`, `ShouldThrowException`, `TirerSurUneGalinette_Works`, `When_NbGalinettes_Is_0_Then_Throws`.

```csharp
// Unit/Service/PartieDeChasseServiceTest.cs
public abstract class PartieDeChasseServiceTest
{
    protected static readonly DateTime Now = new(2024, 6, 6, 14, 50, 45, DateTimeKind.Utc);
    private static readonly Func<DateTime> TimeProvider = () => Now;

    protected readonly PartieDeChasseRepositoryForTests Repository;
    protected readonly PartieDeChasseService PartieDeChasseService;

    protected PartieDeChasseServiceTest()
    {
        Repository = new PartieDeChasseRepositoryForTests();
        PartieDeChasseService = new PartieDeChasseService(Repository, TimeProvider);
    }

    protected PartieDeChasse AvecUnePartieDeChasseExistante(PartieDeChasseBuilder builder)
    {
        var partieDeChasse = builder.Build();
        Repository.Add(partieDeChasse);
        return partieDeChasse;
    }
}

// Unit/Service/TirerSurUneGalinette.cs
public class TirerSurUneGalinette : PartieDeChasseServiceTest
{
    [Fact]
    public void AvecUnChasseurAyantDesBallesEtAssezDeGalinettesSurLeTerrain() { … }

    [Fact]
    public void EchoueAvecUnChasseurNayantPlusDeBalles() { … }

    [Fact]
    public void EchoueCarPasDeGalinetteSurLeTerrain() { … }
}
```

### Test Data Builders and Object Mothers

Why: the Arrange should only show what matters for this test. Building domain objects with constructors in every test spreads their signature everywhere: when `Address` gains a parameter, every test that builds one breaks. The builder is the only place that knows the constructor, so tests resist refactoring.

Rules:

- One builder per aggregate or command, in `Builders/`, named `<Thing>Builder`.
- A static entry point in business language: `UnePartieDeChasseDuBouchonnois()`, `DémarrerUnePartieDeChasse()`, `ANewAddress()`.
- **Sensible defaults for everything**: `Build()` with no configuration returns a valid object. A test only sets what it is about.
- Fluent methods named after the domain, not after fields: `SurUnTerrainRicheEnGalinettes()`, `SurUnTerrainSansGalinettes()`, `SansBalles()`, `At("Bordeaux")`. Avoid `WithNbGalinettes(0)`.
- Nested builders are configured through a lambda, so the test never builds the inner object itself: `.WithPostalCode(_ => _.WithNumber("1 Bis"))`.
- **Object Mothers** for the recurring characters of the domain, as static factories on the builder: `Dédé()`, `Bernard()`, `Robert()`. They return builders, so a test can still tweak them: `Bernard().SansBalles()`.
- Shared names live in constants (`Chasseurs.Bernard`) so the Act and the Assert refer to the same value.
- No logic and no assertion in a builder; `Build()` just calls the constructor.
- **Generate the builder from usage**: write in the test the line you wish you could read, then let the IDE (or the agent) create the missing methods. Never design a builder upfront.

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
public class PartieDeChasseBuilder
{
    private int _nbGalinettes = 3;
    private PartieStatus _status = PartieStatus.EnCours;
    private ChasseurBuilder[] _chasseurs = [];

    public static PartieDeChasseBuilder UnePartieDeChasseDuBouchonnois() => new();

    public PartieDeChasseBuilder SurUnTerrainRicheEnGalinettes(int nbGalinettes = 3)
    {
        _nbGalinettes = nbGalinettes;
        return this;
    }

    public PartieDeChasseBuilder SurUnTerrainSansGalinettes() => SurUnTerrainRicheEnGalinettes(0);

    public PartieDeChasseBuilder Avec(params ChasseurBuilder[] chasseurs)
    {
        _chasseurs = chasseurs;
        return this;
    }

    // Only place that knows the constructor of PartieDeChasse
    public PartieDeChasse Build() => new(
        Guid.NewGuid(),
        new Terrain("Pitibon sur Sauldre") { NbGalinettes = _nbGalinettes },
        _chasseurs.Select(c => c.Build()).ToList(),
        _status
    );
}

public class ChasseurBuilder
{
    private readonly string _nom;
    private int _ballesRestantes;
    private int _nbGalinettes;

    private ChasseurBuilder(string nom, int ballesRestantes)
    {
        _nom = nom;
        _ballesRestantes = ballesRestantes;
    }

    // Object Mothers
    public static ChasseurBuilder Dédé() => new(Chasseurs.Dédé, ballesRestantes: 20);
    public static ChasseurBuilder Bernard() => new(Chasseurs.Bernard, ballesRestantes: 8);
    public static ChasseurBuilder Robert() => new(Chasseurs.Robert, ballesRestantes: 12);

    public ChasseurBuilder SansBalles()
    {
        _ballesRestantes = 0;
        return this;
    }

    public Chasseur Build() => new(_nom) { BallesRestantes = _ballesRestantes, NbGalinettes = _nbGalinettes };
}
```

The same shape in TypeScript, for the plugin's own examples:

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

### Business assertions

Why: a block of `Check.That(x.Y).IsEqualTo(…)` is a technical checklist the reader has to translate. A named assertion states the expected outcome in the domain language, and its name shows up in the failure stack trace (`at PartieDeChasseAssertions.ContientLeChasseurAvec(...)`), so the failure is understood without reading the test.

Rules:

- Extension methods on the domain object, grouped per aggregate in `Assertions/<Aggregate>Assertions.cs`.
- **Named in the domain language**, not in tester language: `ContientLeChasseurAvec`, `ContientLesGalinettes`, `AÉmisLÉvénement`. `ShouldHave…` is a first step, not the target: no hunter ever says “should have”.
- Each returns the object, so assertions chain and read as one sentence describing the expected state.
- Inside, plain library assertions (NFluent, AssertJ, Jest `expect`); no conditional logic, no loops that hide what is checked.
- Assert on the outcome that matters for the behaviour, including side effects required by the business (here, the event that gives traceability), not on every field.
- For the failing paths, assert both the business error and what must or must not have been saved.
- When the whole output is the point (a report, a status, a big aggregate after a start), prefer an approval test (`Verify`) to a long list of assertions.

```csharp
public static class PartieDeChasseAssertions
{
    public static PartieDeChasse AÉmisLÉvénement(
        this PartieDeChasse partieDeChasse, DateTime expectedTime, string expectedMessage)
    {
        Check.That(partieDeChasse.Events).HasSize(1);
        Check.That(partieDeChasse.Events[0]).IsEqualTo(new Event(expectedTime, expectedMessage));
        return partieDeChasse;
    }

    public static PartieDeChasse ContientLeChasseurAvec(
        this PartieDeChasse partieDeChasse, string nom, int ballesRestantes, int galinettes)
    {
        var chasseur = partieDeChasse.Chasseurs.Single(c => c.Nom == nom);
        Check.That(chasseur.BallesRestantes).IsEqualTo(ballesRestantes);
        Check.That(chasseur.NbGalinettes).IsEqualTo(galinettes);
        return partieDeChasse;
    }

    public static PartieDeChasse ContientLesGalinettes(this PartieDeChasse partieDeChasse, int nbGalinettes)
    {
        Check.That(partieDeChasse.Terrain.NbGalinettes).IsEqualTo(nbGalinettes);
        return partieDeChasse;
    }
}
```

A complete test following every rule, from 33 lines down to 8:

```csharp
[Fact]
public void AvecUnChasseurAyantDesBallesEtAssezDeGalinettesSurLeTerrain()
{
    var partieDeChasse = AvecUnePartieDeChasseExistante(
        UnePartieDeChasseDuBouchonnois()
            .SurUnTerrainRicheEnGalinettes()
            .Avec(Dédé(), Bernard(), Robert())
    );

    PartieDeChasseService.TirerSurUneGalinette(partieDeChasse.Id, Chasseurs.Bernard);

    Repository.SavedPartieDeChasse()!
        .ContientLeChasseurAvec(Chasseurs.Bernard, ballesRestantes: 7, galinettes: 1)
        .ContientLesGalinettes(2)
        .AÉmisLÉvénement(Now, "Bernard tire sur une galinette");
}

[Fact]
public void EchoueAvecUnChasseurNayantPlusDeBalles()
{
    var partieDeChasse = AvecUnePartieDeChasseExistante(
        UnePartieDeChasseDuBouchonnois()
            .SurUnTerrainRicheEnGalinettes()
            .Avec(Dédé(), Bernard().SansBalles(), Robert())
    );

    var tirerSansBalle = () => PartieDeChasseService.TirerSurUneGalinette(partieDeChasse.Id, Chasseurs.Bernard);

    Check.ThatCode(tirerSansBalle).Throws<TasPlusDeBallesMonVieuxChasseALaMain>();
    Repository.SavedPartieDeChasse()!
        .AÉmisLÉvénement(Now, "Bernard veut tirer sur une galinette -> T'as plus de balles mon vieux, chasse à la main");
}
```

The second test is the one that lied in the talk: without the event assertion it stayed green when the traceability code was removed. A failing-path test that does not check the business side effect is incomplete.

In TypeScript, the same idea with a custom matcher or a plain function:

```ts
export const theOrder = (order: Order) => ({
  isShippedFreeOfCharge() { expect(order.shippingFees).toEqual(Money.zero()); return this },
  hasEmitted(event: DomainEvent) { expect(order.events).toEqual([event]); return this },
})

theOrder(saved).isShippedFreeOfCharge().hasEmitted(new OrderPlaced(order.id, NOW))
```

### Property-based testing, when necessary

An example is a point; a rule is a line. Example-based tests cover business conformity well and the input space badly. Use a property when, and only when, the item states a rule that must hold for every input of a family:

- invariants (“a game with at least one galinette and armed hunters always starts”);
- failure rules over a range (“any terrain without galinettes, 0 or negative, refuses to start”);
- algebraic laws (commutativity, associativity, identity, round trip such as `parse(format(x)) == x`, idempotence);
- an oracle exists (a simpler or legacy implementation to compare with).

Do not use a property when a single named example explains the behaviour better, when the rule only exists for specific values, or when you would have to re-implement the production logic in the test to state it.

Rules:

- **Properties complement examples, they do not replace them.** Keep one or two named examples (or an approval test) that document the behaviour, and add properties for the rule behind them.
- State the property in words first, in the test list: `forall (terrain avec des galinettes, groupe de chasseurs tous armés) la partie démarre`.
- **Generators encode the preconditions** and live next to the builders. Name them after the domain (`TerrainRicheEnGalinettesGenerator`, `GroupeDeChasseursArmésGenerator`) and generalize beyond the obvious boundary (`Gen.Choose(-1000, 0)` for “no galinettes”, not only `0`).
- Failing paths are properties too: a helper checks the expected business exception and the saved state.
- The property name follows the naming rules and reads as the rule: `SurNImporteQuelTerrainSansGalinettesLaPartieNeDémarrePas`.
- When a property fails, keep the shrunk counter-example as a new named example test.
- In RED, one property is one test; in GREEN, a property may demand a more general implementation than fake it: triangulation is done by the generator.

```csharp
private static Gen<string> NomGenerator()
    => ArbMap.Default.GeneratorFor<string>().Where(nom => !string.IsNullOrWhiteSpace(nom));

private static Arbitrary<(string nom, int nbGalinettes)> TerrainRicheEnGalinettesGenerator()
    => (from nom in NomGenerator()
        from nbGalinettes in Gen.Choose(1, 1000)
        select (nom, nbGalinettes)).ToArbitrary();

private static Arbitrary<(string nom, int nbGalinettes)> TerrainSansGalinettesGenerator()
    => (from nom in NomGenerator()
        // Generalize beyond 0: any value that is not "at least 1" must fail
        from nbGalinettes in Gen.Choose(-1000, 0)
        select (nom, nbGalinettes)).ToArbitrary();

private static Arbitrary<List<(string nom, int nbBalles)>> GroupeDeChasseursArmésGenerator()
    => (from nbChasseurs in Gen.Choose(1, 50)
        from chasseurs in Gen.ListOf(ChasseurArméGenerator(), nbChasseurs)
        select chasseurs).ToArbitrary();

[Property]
public Property Sur1TerrainAvecGalinettesEtDesChasseursArmésLaPartieDémarre()
    => Prop.ForAll(
        TerrainRicheEnGalinettesGenerator(),
        GroupeDeChasseursArmésGenerator(),
        (terrain, chasseurs) =>
        {
            var id = PartieDeChasseService.Demarrer(terrain, chasseurs);
            return Repository.SavedPartieDeChasse()!.Id == id;
        });

[Property]
public Property SurNImporteQuelTerrainSansGalinettesLaPartieNeDémarrePas()
    => Prop.ForAll(
        TerrainSansGalinettesGenerator(),
        GroupeDeChasseursArmésGenerator(),
        (terrain, chasseurs) =>
            MustFailWith<ImpossibleDeDémarrerUnePartieSansGalinettes>(
                () => PartieDeChasseService.Demarrer(terrain, chasseurs),
                savedPartieDeChasse => savedPartieDeChasse == null));
```

```csharp
// In the base class: checks the business exception and the saved state
protected bool MustFailWith<TException>(Action action, Func<PartieDeChasse?, bool>? assert = null)
    where TException : Exception
{
    try
    {
        action();
        return false;
    }
    catch (TException)
    {
        return assert?.Invoke(Repository.SavedPartieDeChasse()) ?? true;
    }
}
```

Equivalent libraries: FsCheck (C#, F#), fast-check (JS/TS), jqwik (Java), Hypothesis (Python).

### Review checklist

`tdd-tester` checks it before returning a test, `tdd-refactorer` before leaving REFACTOR, and `/tdd:status` prints it as a reminder:

- [ ] Would I understand this test in five seconds without opening another file?
- [ ] Does the name say the context and the outcome in business language?
- [ ] Does the Arrange show only what this test is about?
- [ ] Does the Assert read as a business sentence, and check the side effects the business requires?
- [ ] Is there a rule behind these examples that a property should state?
- [ ] If I break the code this test covers, does it turn red? (`/tdd:mutate` answers it)

## Subagents

Three subagents with separate contexts, so the one implementing did not write the test. The main agent orchestrates and delegates each phase. The skill recommends them but does not require them; the hooks protect either way.

| Agent | Phases | Receives | May write | Returns |
| --- | --- | --- | --- | --- |
| `tdd-tester` | ACCEPTANCE, RED | the list item or scenario to cover, existing tests and Fakes, the mode | test files, acceptance tests, Fakes | the test, the failure output, why it fails |
| `tdd-implementer` | GREEN | the failing test and its output, not the full list | production code | the minimal diff, the green unit suite |
| `tdd-refactorer` | REFACTOR | the cycle's diff, the project's rules | code and tests, behaviour unchanged | the refactorings applied |

Prompt requirements:

- `tdd-implementer` never sees the full list, so it cannot anticipate the next cases.
- `tdd-tester` names tests in business language and prefers one assertion per behaviour.
- `tdd-tester` follows the test design guidelines: one class per use case, Arrange through Test Data Builders and Object Mothers (creating the missing builder method from usage), Assert through business assertions (creating the missing one), a property when the item is tagged `[property]`; it runs the review checklist before returning.
- `tdd-refactorer` refactors tests towards the guidelines: extracts builders, Object Mothers and business assertions, renames tests whose name describes the implementation; it never removes a check while doing so.
- `tdd-tester` in outside-in: reaches for a Fake before any mock; reuses an existing Fake rather than writing a second one; asserts on state exposed by the Fake, not on calls; adds a `tdd-guard: allow-mock <reason>` line only when no port exists (third-party SDK, legacy code) and says so in its answer.
- `tdd-refactorer` adds no behaviour; it may refactor tests, Fakes and test support, but the assertion count may not drop (checked by `tdd.js next`). The count covers test and test support files, plus calls matching `assertionMethodPatterns`, so moving three `Check.That` into a business assertion is not seen as a loss.
- Each agent's `tools` frontmatter is restricted to what it strictly needs.

## Hooks

The hooks enforce the rules the skill describes. Protocol: hook JSON on stdin; exit code 2 blocks, with the stderr message fed back to Claude; 0 lets it through. With `strict: false` they exit 0 with a warning.

### guard-write.js (PreToolUse, matcher `Write|Edit|MultiEdit|NotebookEdit`)

Reads `tool_input.file_path`, classifies it (unit test or Fake, acceptance test, production, free) from the config globs, then applies this matrix:

| Phase | Unit tests, Fakes, test support | Acceptance tests | Production code | `.tdd/state.json`, `config.json` |
| --- | --- | --- | --- | --- |
| OFF | allowed | allowed | allowed | blocked |
| LIST | blocked | blocked | blocked | blocked |
| ACCEPTANCE | blocked | allowed | blocked | blocked |
| RED | allowed | blocked | blocked | blocked |
| GREEN | blocked | blocked | allowed | blocked |
| REFACTOR | allowed | allowed | allowed | blocked |

`.tdd/test-list.md` stays writable in every phase except GREEN.

Extra checks on the proposed content, in ACCEPTANCE and RED:

- reject disabling markers (`.skip`, `xit`, `xdescribe`, `@Disabled`, `@Ignore`, `pytest.mark.skip`, `[Ignore]`);
- reject more than one new test compared with the state on entering the phase (regex count of `it(`, `test(`, `@Test`, `[Fact]`, `[Theory]`, `[Property]`, `def test_`, `@given`, `fc.assert(`, configurable); a property counts as one test, whatever the number of generated runs;
- apply `mockPolicy` for the current mode: under `justify`, any new line matching `mockPatterns` without a `tdd-guard: allow-mock <reason>` comment on the same or previous line is blocked, and the message points to `references/fakes.md` and suggests the Fake to write; under `forbid`, it is blocked even with a reason; justified mocks are appended to `state.json`.

### guard-bash.js (PreToolUse, matcher `Bash`)

Inspects `tool_input.command` to close bypasses:

- writes to a file the phase protects (`>`, `>>`, `tee`, `sed -i`, `cp`, `mv`, `rm`, `git checkout`/`restore` on those paths);
- calls to `tdd.js approve` or `tdd.js off`;
- writes into `.tdd/`.

This is a heuristic, not a sandbox; the README says so plainly.

### check-stop.js (Stop)

- GREEN or REFACTOR with a red unit suite: blocks stopping (“the unit suite must be green before handing back”).
- ACCEPTANCE or RED with no new failing test: blocks with a reminder.
- If `stop_hook_active` is true, lets it stop with a warning, to avoid an endless loop.

### session-start.js (SessionStart)

When a phase is active, injects a short summary into the context: mode, phase, acceptance test, current test, remaining list items, the rules of the phase.

## Mutation testing

Mutation testing checks that the tests the agent wrote actually bite; it is optional and triggered by `/tdd:mutate`.

- Runs `mutationCommand` restricted to the files modified since `/tdd:start` (list kept in `state.json`).
- Target tools: Stryker (JS/TS, C#), PIT (Java), mutmut (Python). The plugin does not install them; it prints the install command when missing.
- Shows the score and surviving mutants, then offers to add one list item per survivor. A survivor on a side effect (an event, a save, a notification) usually means a test asserts the return value or the exception but not the business consequence: the item suggests the business assertion to add.
- Never blocks: it is a feedback tool, not a guard.

## Acceptance criteria

The plugin itself is built test-first, with `node:test` and no dependency. Each hook script is tested by piping a JSON payload on stdin and checking the exit code and stderr.

Acceptance tests (one per line, written first):

- [ ] In GREEN, an `Edit` on `src/foo.test.ts` is blocked with a message quoting the rule.
- [ ] In GREEN, an `Edit` on `test/fakes/in-memory-orders.ts` is blocked.
- [ ] In RED, a `Write` on `src/foo.ts` is blocked.
- [ ] In RED, adding two tests at once is blocked.
- [ ] In RED, adding `it.skip(` is blocked.
- [ ] In GREEN, `sed -i` on a test file through Bash is blocked.
- [ ] An agent call to `tdd.js off` through Bash is blocked.
- [ ] Inside-out: `/tdd:approve` goes from LIST to RED.
- [ ] Outside-in: `/tdd:approve` goes from LIST to ACCEPTANCE.
- [ ] Outside-in, in ACCEPTANCE: writing a unit test or production code is blocked; writing one acceptance test is allowed.
- [ ] Outside-in, `mockPolicy: justify`: a new `jest.fn()` without a reason is blocked and the message suggests a Fake; with `tdd-guard: allow-mock <reason>` it passes and appears in `/tdd:status`.
- [ ] Outside-in, `mockPolicy: forbid`: a justified mock is still blocked.
- [ ] Inside-out, `mockPolicy: allow`: `jest.fn()` passes without a reason.
- [ ] `tdd.js next` in RED refuses GREEN when the unit suite is green.
- [ ] `tdd.js next` in GREEN refuses REFACTOR when the unit suite is red, or when test or Fake files changed.
- [ ] `tdd.js next` in REFACTOR refuses when the assertion count dropped.
- [ ] Outside-in, `tdd.js next` in REFACTOR goes to RED while the acceptance test is red, to ACCEPTANCE once it is green with scenarios left, to OFF when all is done.
- [ ] The mode cannot change outside OFF and LIST.
- [ ] The Stop hook blocks stopping in GREEN with a red unit suite, and lets it stop when `stop_hook_active` is set.
- [ ] In RED, writing a builder in `test/builders/**` is allowed; in GREEN, it is blocked like a Fake.
- [ ] In RED, adding one `[Property]` (or `fc.assert(fc.property(`) counts as exactly one new test.
- [ ] `tdd.js next` in REFACTOR accepts extracting three assertions into a business assertion matching `assertionMethodPatterns` (assertion count not lowered).
- [ ] With `strict: false`, every case above warns without blocking.
- [ ] A free file (`README.md`) is writable in every phase.
- [ ] A full cycle runs end to end in `examples/`: FizzBuzz inside-out (with one property for the rule “every multiple of 15 is FizzBuzz”), and a small “place an order” use case outside-in with an in-memory repository Fake, a shared contract test, an `OrderBuilder` with Object Mothers and business assertions on the saved order.

## Out of scope and instructions for Claude Code

Out of scope for v1: a real filesystem sandbox, AST analysis of tests (regexes are enough), several features in parallel, a graphical interface, automatic generation of Fakes.

Instructions to Claude Code for building the plugin:

1. First read the official Claude Code documentation on plugins, hooks, subagents and slash commands, and adjust this spec where a format differs.
2. Propose the test list derived from the acceptance criteria and wait for approval.
3. Build it strictly test-first, one test at a time, starting with `scripts/lib/` (state, config, file classification, mock detection), then `guard-write.js`, `tdd.js`, `check-stop.js`, `guard-bash.js`, `session-start.js`.
4. Blocking messages in English, each stating the rule, the teaching reason and the expected action.
5. Small, frequent commits using Conventional Commits.
6. Finish with the README (installation, configuration, both modes, Fakes vs mocks, known limits) and the two example projects.
