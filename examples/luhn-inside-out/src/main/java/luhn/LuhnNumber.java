package luhn;

import java.util.Optional;

/** A number whose Luhn (mod 10) checksum holds, like card, IMEI and SIRET numbers. Only parse creates one. */
public final class LuhnNumber {
    private final String digits;

    private LuhnNumber(String digits) {
        this.digits = digits;
    }

    // An invalid number is an expected answer, not an exceptional situation: an empty Optional, no exception.
    public static Optional<LuhnNumber> parse(String number) {
        String digits = number.replace(" ", "");
        return isOnlyDigits(digits) && luhnSum(digits) % 10 == 0 ? Optional.of(new LuhnNumber(digits)) : Optional.empty();
    }

    public static int checkDigitOf(String payload) {
        return (10 - luhnSum(payload + "0") % 10) % 10;
    }

    @Override
    public String toString() {
        return digits;
    }

    private static boolean isOnlyDigits(String digits) {
        return !digits.isEmpty() && digits.chars().allMatch(c -> c >= '0' && c <= '9');
    }

    // From the right, every second digit is doubled, and a doubled digit above 9 has 9 subtracted.
    private static int luhnSum(String digits) {
        int sum = 0;
        for (int position = 0; position < digits.length(); position++) {
            int digit = digits.charAt(digits.length() - 1 - position) - '0';
            sum += position % 2 == 1 ? doubled(digit) : digit;
        }
        return sum;
    }

    private static int doubled(int digit) {
        int doubled = digit * 2;
        return doubled > 9 ? doubled - 9 : doubled;
    }
}
