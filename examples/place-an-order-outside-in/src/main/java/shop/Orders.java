package shop;

import java.util.Optional;

/** The Orders port: what the use cases need from order storage, in the domain language. */
public interface Orders {
    void save(Order order);

    Optional<Order> byId(String id);
}
