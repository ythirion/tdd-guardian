package luhn;

import com.pholser.junit.quickcheck.From;
import com.pholser.junit.quickcheck.Property;
import com.pholser.junit.quickcheck.runner.JUnitQuickcheck;
import luhn.generators.ValidLuhnNumbers;
import org.junit.runner.RunWith;

import static org.assertj.core.api.Assertions.assertThat;

// Round trip: parsing a valid Luhn number, then writing it back as a String, gives the same String.
@RunWith(JUnitQuickcheck.class)
public class RoundTripOfALuhnNumber {
    @Property
    public void anyValidLuhnNumberParsedThenWrittenBackIsTheSameString(@From(ValidLuhnNumbers.class) String number) {
        assertThat(LuhnNumber.parse(number)).map(LuhnNumber::toString).contains(number);
    }
}
