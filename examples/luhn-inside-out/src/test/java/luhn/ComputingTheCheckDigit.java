package luhn;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ComputingTheCheckDigit {
    @Test
    void ofTheClassicExample7992739871Is3() {
        assertThat(LuhnNumber.checkDigitOf("7992739871")).isEqualTo(3);
    }
}
