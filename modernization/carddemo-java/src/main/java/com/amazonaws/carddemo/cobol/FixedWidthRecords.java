package com.amazonaws.carddemo.cobol;

import com.amazonaws.carddemo.posting.model.AccountRecord;
import com.amazonaws.carddemo.posting.model.CardXrefRecord;
import com.amazonaws.carddemo.posting.model.DailyTransaction;
import com.amazonaws.carddemo.posting.model.TranCatBalanceRecord;

/**
 * Fixed-width record parsers derived from CardDemo copybooks.
 */
public final class FixedWidthRecords {

    private FixedWidthRecords() {
    }

    public static DailyTransaction parseDailyTransaction(String line) {
        return new DailyTransaction(
                slice(line, 0, 16),
                slice(line, 16, 18),
                slice(line, 18, 22),
                slice(line, 22, 32),
                slice(line, 32, 132),
                ZonedDecimal.parse(slice(line, 132, 143)),
                slice(line, 143, 152),
                slice(line, 152, 202),
                slice(line, 202, 252),
                slice(line, 252, 262),
                slice(line, 262, 278),
                slice(line, 278, 304),
                slice(line, 304, 330),
                line.length() >= 350 ? line.substring(0, 350) : padRight(line, 350)
        );
    }

    public static AccountRecord parseAccount(String line) {
        return new AccountRecord(
                slice(line, 0, 11),
                slice(line, 11, 12),
                ZonedDecimal.parse(slice(line, 12, 24)),
                ZonedDecimal.parse(slice(line, 24, 36)),
                ZonedDecimal.parse(slice(line, 36, 48)),
                slice(line, 48, 58),
                slice(line, 58, 68),
                slice(line, 68, 78),
                ZonedDecimal.parse(slice(line, 78, 90)),
                ZonedDecimal.parse(slice(line, 90, 102)),
                slice(line, 102, 112),
                slice(line, 112, 122)
        );
    }

    public static CardXrefRecord parseCardXref(String line) {
        return new CardXrefRecord(
                slice(line, 0, 16),
                slice(line, 16, 25),
                slice(line, 25, 36)
        );
    }

    public static TranCatBalanceRecord parseTranCatBalance(String line) {
        return new TranCatBalanceRecord(
                slice(line, 0, 11),
                slice(line, 11, 13),
                slice(line, 13, 17),
                ZonedDecimal.parse(slice(line, 17, 28))
        );
    }

    public static String formatAccount(AccountRecord account) {
        StringBuilder sb = new StringBuilder(300);
        sb.append(padRight(account.acctId(), 11));
        sb.append(padRight(account.activeStatus(), 1));
        sb.append(ZonedDecimal.format(account.currBal(), 12));
        sb.append(ZonedDecimal.format(account.creditLimit(), 12));
        sb.append(ZonedDecimal.format(account.cashCreditLimit(), 12));
        sb.append(padRight(account.openDate(), 10));
        sb.append(padRight(account.expirationDate(), 10));
        sb.append(padRight(account.reissueDate(), 10));
        sb.append(ZonedDecimal.format(account.currCycCredit(), 12));
        sb.append(ZonedDecimal.format(account.currCycDebit(), 12));
        sb.append(padRight(account.addrZip(), 10));
        sb.append(padRight(account.groupId(), 10));
        return padRight(sb.toString(), 300);
    }

    private static String slice(String line, int start, int end) {
        if (line.length() <= start) {
            return "";
        }
        if (line.length() >= end) {
            return line.substring(start, end);
        }
        return padRight(line.substring(start), end - start);
    }

    private static String padRight(String value, int length) {
        if (value.length() >= length) {
            return value.substring(0, length);
        }
        return value + " ".repeat(length - value.length());
    }
}
