package shop;

import java.util.List;

public record Order(String id, List<OrderLine> lines, String country) {
    private static final int FREE_SHIPPING_ABOVE = 50;
    private static final int STANDARD_SHIPPING = 5;

    public int total() {
        return lines.stream().mapToInt(line -> line.price() * line.quantity()).sum();
    }

    public int shippingFees() {
        return total() > FREE_SHIPPING_ABOVE ? 0 : STANDARD_SHIPPING;
    }
}
