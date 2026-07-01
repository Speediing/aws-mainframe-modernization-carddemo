package com.amazonaws.carddemo.posting.model;

import java.math.BigDecimal;

public record AccountRecord(
        String acctId,
        String activeStatus,
        BigDecimal currBal,
        BigDecimal creditLimit,
        BigDecimal cashCreditLimit,
        String openDate,
        String expirationDate,
        String reissueDate,
        BigDecimal currCycCredit,
        BigDecimal currCycDebit,
        String addrZip,
        String groupId
) {
    public AccountRecord withUpdatedBalances(BigDecimal newCurrBal, BigDecimal newCycCredit, BigDecimal newCycDebit) {
        return new AccountRecord(
                acctId, activeStatus, newCurrBal, creditLimit, cashCreditLimit,
                openDate, expirationDate, reissueDate, newCycCredit, newCycDebit,
                addrZip, groupId
        );
    }
}
