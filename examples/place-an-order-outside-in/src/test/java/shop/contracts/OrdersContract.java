package shop.contracts;

import org.junit.jupiter.api.Test;
import shop.Order;
import shop.Orders;

import static org.assertj.core.api.Assertions.assertThat;
import static shop.builders.OrderBuilder.anOrder;

/** The Orders port contract, run against the Fake and every real adapter: a Fake must not lie. */
public abstract class OrdersContract {
    protected abstract Orders orders();

    @Test
    void findsASavedOrderById() {
        Orders orders = orders();
        Order order = anOrder().worth(60).build();

        orders.save(order);

        assertThat(orders.byId(order.id())).contains(order);
    }
}
