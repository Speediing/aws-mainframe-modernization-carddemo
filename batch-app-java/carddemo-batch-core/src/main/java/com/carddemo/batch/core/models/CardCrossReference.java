package com.carddemo.batch.core.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Modernized representation of CVACT03Y card cross-reference entity.
 */
public final class CardCrossReference {

    @NotBlank
    private final String cardNumber;

    @PositiveOrZero
    private final long customerId;

    @PositiveOrZero
    private final long accountId;

    public CardCrossReference(String cardNumber, long customerId, long accountId) {
        this.cardNumber = cardNumber;
        this.customerId = customerId;
        this.accountId = accountId;
    }

    public String getCardNumber() {
        return cardNumber;
    }

    public long getCustomerId() {
        return customerId;
    }

    public long getAccountId() {
        return accountId;
    }
}
