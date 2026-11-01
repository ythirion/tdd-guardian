package shop.builders;

import shop.Order;
import shop.OrderLine;

import java.util.List;
import java.util.UUID;

/** The only place that knows the Order constructor. Defaults give a valid order. */
public final class OrderBuilder {
    private List<OrderLine> lines = List.of(new OrderLine("Growing Object-Oriented Software", 40, 1));
    private final String country = "FR";

    private OrderBuilder() {
    }

    public static OrderBuilder anOrder() {
        return new OrderBuilder();
    }

    // Object Mothers: the orders that keep coming back in the shop's examples.
    public static OrderBuilder aBigOrder() {
        return anOrder().worth(60);
    }

    public static OrderBuilder aSmallOrder() {
        return anOrder().worth(30);
    }

    public OrderBuilder worth(int amount) {
        lines = List.of(new OrderLine("A book", amount, 1));
        return this;
    }

    public OrderBuilder withoutLines() {
        lines = List.of();
        return this;
    }

    public Order build() {
        return new Order(UUID.randomUUID().toString(), lines, country);
    }
}
