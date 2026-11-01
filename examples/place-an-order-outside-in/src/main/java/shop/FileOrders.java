package shop;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Orders adapter storing one order per line in a text file, checked by the same contract test as the Fake. */
public final class FileOrders implements Orders {
    private static final String FIELD = "\t";

    private final Path file;

    public FileOrders(Path file) {
        this.file = file;
    }

    @Override
    public void save(Order order) {
        List<String> rows = new ArrayList<>(readRows());
        rows.removeIf(row -> row.startsWith(order.id() + FIELD));
        rows.add(toRow(order));
        try {
            Files.write(file, rows);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @Override
    public Optional<Order> byId(String id) {
        return readRows().stream().filter(row -> row.startsWith(id + FIELD)).findFirst().map(FileOrders::toOrder);
    }

    private static String toRow(Order order) {
        StringBuilder row = new StringBuilder(order.id()).append(FIELD).append(order.country());
        for (OrderLine line : order.lines()) {
            row.append(FIELD).append(line.title()).append(FIELD).append(line.price()).append(FIELD).append(line.quantity());
        }
        return row.toString();
    }

    private static Order toOrder(String row) {
        String[] fields = row.split(FIELD);
        List<OrderLine> lines = new ArrayList<>();
        for (int i = 2; i < fields.length; i += 3) {
            lines.add(new OrderLine(fields[i], Integer.parseInt(fields[i + 1]), Integer.parseInt(fields[i + 2])));
        }
        return new Order(fields[0], List.copyOf(lines), fields[1]);
    }

    private List<String> readRows() {
        try {
            return Files.exists(file) ? Files.readAllLines(file) : List.of();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
