package shop.unit;

import shop.Orders;
import shop.contracts.OrdersContract;
import shop.fakes.InMemoryOrders;

class InMemoryOrdersContractTest extends OrdersContract {
    @Override
    protected Orders orders() {
        return new InMemoryOrders();
    }
}
