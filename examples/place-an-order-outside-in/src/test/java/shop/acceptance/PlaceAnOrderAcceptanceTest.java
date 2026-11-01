package shop.acceptance;

import org.junit.jupiter.api.Test;
import shop.PlaceOrder;
import shop.Placement;
import shop.Placement.Refused;
import shop.fakes.InMemoryOrders;

import static org.assertj.core.api.Assertions.assertThat;
import static shop.assertions.OrderAssertions.theOrder;
import static shop.builders.OrderBuilder.aBigOrder;
import static shop.builders.OrderBuilder.aSmallOrder;
import static shop.builders.OrderBuilder.anOrder;

class PlaceAnOrderAcceptanceTest {
    private final InMemoryOrders orders = new InMemoryOrders();
    private final PlaceOrder placeOrder = new PlaceOrder(orders);

    @Test
    void refusesAnOrderWithoutLinesAndSavesNothing() {
        Placement placement = placeOrder.handle(anOrder().withoutLines().build());

        assertThat(placement).isEqualTo(new Refused("an order needs at least one line"));
        assertThat(orders.saved()).isEmpty();
    }

    @Test
    void savesAnOrderAbove50EurosWithFreeShipping() {
        placeOrder.handle(aBigOrder().build());

        theOrder(orders.saved().getFirst()).isShippedFreeOfCharge();
    }

    @Test
    void savesAnOrderBelow50EurosWith5EurosOfShipping() {
        placeOrder.handle(aSmallOrder().build());

        theOrder(orders.saved().getFirst()).costsShipping(5);
    }
}
