package shop.unit;

import org.junit.jupiter.api.Test;
import shop.Order;
import shop.PlaceOrder;
import shop.Placement;
import shop.Placement.Placed;
import shop.Placement.Refused;
import shop.fakes.InMemoryOrders;

import static org.assertj.core.api.Assertions.assertThat;
import static shop.builders.OrderBuilder.anOrder;

class PlaceAnOrderTest {
    private final InMemoryOrders orders = new InMemoryOrders();
    private final PlaceOrder placeOrder = new PlaceOrder(orders);

    @Test
    void refusesAnOrderWithoutLines() {
        Placement placement = placeOrder.handle(anOrder().withoutLines().build());

        assertThat(placement).isEqualTo(new Refused("an order needs at least one line"));
        assertThat(orders.saved()).isEmpty();
    }

    @Test
    void savesAnOrderWithLines() {
        Order order = anOrder().build();

        Placement placement = placeOrder.handle(order);

        assertThat(placement).isEqualTo(new Placed(order.id()));
        assertThat(orders.saved()).containsExactly(order);
    }
}
