package shop.unit;

import org.junit.jupiter.api.io.TempDir;
import shop.FileOrders;
import shop.Orders;
import shop.contracts.OrdersContract;

import java.nio.file.Path;

class FileOrdersContractTest extends OrdersContract {
    @TempDir
    Path folder;

    @Override
    protected Orders orders() {
        return new FileOrders(folder.resolve("orders.tsv"));
    }
}
