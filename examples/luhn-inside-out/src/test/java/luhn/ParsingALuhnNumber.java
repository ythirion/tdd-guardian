package luhn;

import org.junit.jupiter.api.Test;

import static luhn.LuhnNumber.parse;
import static org.assertj.core.api.Assertions.assertThat;

class ParsingALuhnNumber {
    @Test
    void failsOnAnEmptyNumber() {
        assertThat(parse("")).isEmpty();
    }

    @Test
    void aSingleZeroIsALuhnNumber() {
        assertThat(parse("0")).isPresent();
    }

    @Test
    void failsOnASingleNonZeroDigit() {
        assertThat(parse("1")).isEmpty();
    }

    @Test
    void everySecondDigitFromTheRightIsDoubled() {
        assertThat(parse("18")).isPresent();
    }

    @Test
    void aDoubledDigitAbove9Has9Subtracted() {
        assertThat(parse("59")).isPresent();
    }

    @Test
    void spacesAreIgnored() {
        assertThat(parse("4539 3195 0343 6467")).isPresent();
    }

    @Test
    void failsOnANumberContainingALetter() {
        assertThat(parse("4539 3195 0343 646A")).isEmpty();
    }
}
