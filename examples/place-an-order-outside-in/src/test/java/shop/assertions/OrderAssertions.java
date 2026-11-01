package shop.assertions;

import org.assertj.core.api.AbstractAssert;
import shop.Order;

import static org.assertj.core.api.Assertions.assertThat;

/** Business assertions on an order, chained: theOrder(saved).isShippedFreeOfCharge() */
public final class OrderAssertions extends AbstractAssert<OrderAssertions, Order> {
    private OrderAssertions(Order order) {
        super(order, OrderAssertions.class);
    }

    public static OrderAssertions theOrder(Order order) {
        return new OrderAssertions(order);
    }

    public OrderAssertions isShippedFreeOfCharge() {
        assertThat(actual.shippingFees()).as("shipping fees").isZero();
        return this;
    }

    public OrderAssertions costsShipping(int amount) {
        assertThat(actual.shippingFees()).as("shipping fees").isEqualTo(amount);
        return this;
    }
}
