package shop;

/** The outcome of placing an order: a refusal is a value the caller handles, not an exception. */
public sealed interface Placement {
    record Placed(String orderId) implements Placement {
    }

    record Refused(String reason) implements Placement {
    }
}
