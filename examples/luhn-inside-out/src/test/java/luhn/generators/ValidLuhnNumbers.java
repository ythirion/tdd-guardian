package luhn.generators;

import com.pholser.junit.quickcheck.generator.GenerationStatus;
import com.pholser.junit.quickcheck.generator.Generator;
import com.pholser.junit.quickcheck.random.SourceOfRandomness;
import luhn.LuhnNumber;

/** Valid Luhn numbers: a random payload of 1 to 30 digits, followed by its check digit. */
public class ValidLuhnNumbers extends Generator<String> {
    public ValidLuhnNumbers() {
        super(String.class);
    }

    @Override
    public String generate(SourceOfRandomness random, GenerationStatus status) {
        StringBuilder payload = new StringBuilder();
        int length = random.nextInt(1, 30);
        for (int i = 0; i < length; i++) {
            payload.append(random.nextInt(0, 9));
        }
        return payload.toString() + LuhnNumber.checkDigitOf(payload.toString());
    }
}
