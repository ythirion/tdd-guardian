package shop.unit;

import org.junit.jupiter.api.Test;

import static shop.assertions.OrderAssertions.theOrder;
import static shop.builders.OrderBuilder.aBigOrder;
import static shop.builders.OrderBuilder.aSmallOrder;

class ShippingFeesOfAnOrder {
    @Test
    void areFreeAbove50Euros() {
        theOrder(aBigOrder().build()).isShippedFreeOfCharge();
    }

    @Test
    void are5EurosBelow50Euros() {
        theOrder(aSmallOrder().build()).costsShipping(5);
    }
}
