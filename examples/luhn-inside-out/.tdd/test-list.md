# Test list: Luhn number

Mode: inside-out. The list opens with the non-passing case, to decide first how a failure is
reported. Each item says which part of the implementation it drives, in the order that grows the
thinnest complete implementation.

- [x] an empty number is not a Luhn number
      → drives: the signature: parse returns Optional.empty() for an invalid number, never an exception (fake it)
- [x] a single zero is a Luhn number
      → drives: the LuhnNumber type, created for a non-empty number
- [x] a single non-zero digit is not a Luhn number
      → drives: the checksum: the sum of the digits must end with 0
- [x] every second digit from the right is doubled: 18 is a Luhn number
      → drives: the doubling, walking the digits from the right
- [x] a doubled digit above 9 has 9 subtracted: 59 is a Luhn number
      → drives: the reduction of a doubled digit to one digit
- [x] spaces are ignored: 4539 3195 0343 6467 is a Luhn number
      → drives: the normalisation of the input
- [x] a number containing a letter is not a Luhn number: 4539 3195 0343 646A
      → drives: the digits-only guard (the sum alone accepts this one)
- [x] the check digit of 7992739871 is 3
      → drives: checkDigitOf (fake it: 3)
- [x] [property] round trip: any valid Luhn number, parsed then written back, is the same String
      → drives: toString, and the general check digit the generator needs (payload + check digit)
