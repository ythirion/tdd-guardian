# Test list: Luhn number

Mode: inside-out. One example per item: input → outcome, then the rule it forces.

- [x] "" → not a Luhn number (Optional.empty())
- [x] "0" → a Luhn number
- [x] "1" → not a Luhn number: the digit sum must end with 0
- [x] "18" → a Luhn number: every second digit from the right is doubled
- [x] "59" → a Luhn number: a doubled digit above 9 has 9 subtracted
- [x] "4539 3195 0343 6467" → a Luhn number: spaces are ignored
- [x] "4539 3195 0343 646A" → not a Luhn number: digits only
- [x] checkDigitOf("7992739871") → 3
- [x] [property] any valid Luhn number n → parse(n).toString() is n
