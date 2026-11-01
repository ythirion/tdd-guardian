package shop.fakes;

import shop.Order;
import shop.Orders;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Fake of the Orders port: a small working in-memory implementation, shared by every test. */
public final class InMemoryOrders implements Orders {
    private final Map<String, Order> orders = new LinkedHashMap<>();

    @Override
    public void save(Order order) {
        orders.put(order.id(), order);
    }

    @Override
    public Optional<Order> byId(String id) {
        return Optional.ofNullable(orders.get(id));
    }

    public List<Order> saved() {
        return new ArrayList<>(orders.values());
    }
}
