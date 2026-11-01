package shop;

import shop.Placement.Placed;
import shop.Placement.Refused;

/** Use case: place an order. It depends on the Orders port only, never on an adapter. */
public final class PlaceOrder {
    private final Orders orders;

    public PlaceOrder(Orders orders) {
        this.orders = orders;
    }

    public Placement handle(Order order) {
        if (order.lines().isEmpty()) {
            return new Refused("an order needs at least one line");
        }
        orders.save(order);
        return new Placed(order.id());
    }
}
