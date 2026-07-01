package com.amazonaws.carddemo.cobol;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * COBOL zoned decimal (DISPLAY) parser and formatter for {@code S9(n)V99} fields.
 */
public final class ZonedDecimal {

    private ZonedDecimal() {
    }

    public static BigDecimal parse(String field) {
        if (field == null || field.isBlank()) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY);
        }
        String trimmed = field.stripTrailing();
        int totalLength = trimmed.length();
        int integerDigits = totalLength - 2;
        char last = trimmed.charAt(totalLength - 1);
        String body = trimmed.substring(0, totalLength - 1);

        int sign;
        String allDigits;
        if (isOverpunch(last)) {
            int digit = overpunchDigit(last);
            sign = overpunchSign(last);
            allDigits = body + digit;
        } else {
            allDigits = trimmed;
            sign = 1;
        }

        String integerPart = allDigits.substring(0, integerDigits);
        if (integerPart.isEmpty()) {
            integerPart = "0";
        }
        String decimalPart = allDigits.substring(integerDigits);
        BigDecimal value = new BigDecimal(integerPart + "." + decimalPart);
        return sign < 0 ? value.negate() : value;
    }

    public static String format(BigDecimal value, int totalLength) {
        int integerDigits = totalLength - 2;
        int sign = value.signum() < 0 ? -1 : 1;
        BigDecimal absolute = value.abs().setScale(2, RoundingMode.HALF_UP);
        String scaled = absolute.movePointRight(2).toPlainString();
        scaled = scaled.length() > integerDigits + 2
                ? scaled.substring(scaled.length() - (integerDigits + 2))
                : String.format("%0" + (integerDigits + 2) + "d", Long.parseLong(scaled));

        String body = scaled.substring(0, scaled.length() - 1);
        int lastDigit = Character.getNumericValue(scaled.charAt(scaled.length() - 1));
        char lastChar = toOverpunch(lastDigit, sign);
        return body + lastChar;
    }

    private static boolean isOverpunch(char c) {
        return c == '{' || c == '}' || (c >= 'A' && c <= 'R');
    }

    private static int overpunchDigit(char c) {
        if (c == '{' || c == '}') {
            return 0;
        }
        if (c >= 'A' && c <= 'I') {
            return c - 'A' + 1;
        }
        return c - 'J' + 1;
    }

    private static int overpunchSign(char c) {
        if (c == '}' || (c >= 'J' && c <= 'R')) {
            return -1;
        }
        return 1;
    }

    private static char toOverpunch(int digit, int sign) {
        if (sign >= 0) {
            return digit == 0 ? '{' : (char) ('A' + digit - 1);
        }
        return digit == 0 ? '}' : (char) ('J' + digit - 1);
    }
}
