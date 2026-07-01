package com.amazonaws.carddemo.posting;

import com.amazonaws.carddemo.posting.model.AccountRecord;
import com.amazonaws.carddemo.posting.model.CardXrefRecord;
import com.amazonaws.carddemo.posting.model.DailyTransaction;
import com.amazonaws.carddemo.posting.model.ValidationResult;

import java.math.BigDecimal;
import java.util.Map;

/**
 * Port of CBTRN02C validation paragraphs {@code 1500-VALIDATE-TRAN} through {@code 1500-B-LOOKUP-ACCT}.
 */
public final class TransactionValidator {

    public ValidationResult validate(
            DailyTransaction transaction,
            Map<String, CardXrefRecord> cardXrefByCard,
            Map<String, AccountRecord> accountById) {

        CardXrefRecord xref = cardXrefByCard.get(transaction.cardNum());
        if (xref == null) {
            return new ValidationResult(100, "INVALID CARD NUMBER FOUND");
        }

        AccountRecord account = accountById.get(xref.acctId());
        if (account == null) {
            return new ValidationResult(101, "ACCOUNT RECORD NOT FOUND");
        }

        BigDecimal tempBal = account.currCycCredit()
                .subtract(account.currCycDebit())
                .add(transaction.amount());

        if (account.creditLimit().compareTo(tempBal) < 0) {
            return new ValidationResult(102, "OVERLIMIT TRANSACTION");
        }

        if (account.expirationDate().compareTo(transaction.transactionDate()) < 0) {
            return new ValidationResult(103, "TRANSACTION RECEIVED AFTER ACCT EXPIRATION");
        }

        return ValidationResult.OK;
    }
}
