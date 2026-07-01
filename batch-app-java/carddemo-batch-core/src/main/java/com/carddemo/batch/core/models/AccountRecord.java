package com.carddemo.batch.core.models;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

/**
 * Modernized representation of CVACT01Y account entity.
 */
public final class AccountRecord {

    @PositiveOrZero
    private final long accountId;

    private final boolean active;

    @NotNull
    private BigDecimal currentBalance;

    @NotNull
    @PositiveOrZero
    private final BigDecimal creditLimit;

    @NotNull
    @PositiveOrZero
    private final BigDecimal cashCreditLimit;

    @NotBlank
    private final String groupId;

    public AccountRecord(
            long accountId,
            boolean active,
            BigDecimal currentBalance,
            BigDecimal creditLimit,
            BigDecimal cashCreditLimit,
            String groupId) {
        this.accountId = accountId;
        this.active = active;
        this.currentBalance = currentBalance;
        this.creditLimit = creditLimit;
        this.cashCreditLimit = cashCreditLimit;
        this.groupId = groupId;
    }

    public long getAccountId() {
        return accountId;
    }

    public boolean isActive() {
        return active;
    }

    public BigDecimal getCurrentBalance() {
        return currentBalance;
    }

    public void setCurrentBalance(BigDecimal currentBalance) {
        this.currentBalance = currentBalance;
    }

    public BigDecimal getCreditLimit() {
        return creditLimit;
    }

    public BigDecimal getCashCreditLimit() {
        return cashCreditLimit;
    }

    public String getGroupId() {
        return groupId;
    }
}
