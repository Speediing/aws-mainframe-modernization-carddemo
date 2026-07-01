package com.carddemo.batch.core.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * Modernized representation of CVTRA05Y / CVTRA06Y transaction entity.
 */
public final class TransactionRecord {

    @NotBlank
    private final String transactionId;

    @NotBlank
    private final String typeCode;

    private final int categoryCode;

    @NotBlank
    private final String description;

    @NotNull
    private final BigDecimal amount;

    @NotBlank
    private final String cardNumber;

    private final long accountId;

    public TransactionRecord(
            String transactionId,
            String typeCode,
            int categoryCode,
            String description,
            BigDecimal amount,
            String cardNumber,
            long accountId) {
        this.transactionId = transactionId;
        this.typeCode = typeCode;
        this.categoryCode = categoryCode;
        this.description = description;
        this.amount = amount;
        this.cardNumber = cardNumber;
        this.accountId = accountId;
    }

    public String getTransactionId() {
        return transactionId;
    }

    public String getTypeCode() {
        return typeCode;
    }

    public int getCategoryCode() {
        return categoryCode;
    }

    public String getDescription() {
        return description;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public String getCardNumber() {
        return cardNumber;
    }

    public long getAccountId() {
        return accountId;
    }

    public TransactionRecord withAccountId(long newAccountId) {
        return new TransactionRecord(
                transactionId,
                typeCode,
                categoryCode,
                description,
                amount,
                cardNumber,
                newAccountId);
    }
}
