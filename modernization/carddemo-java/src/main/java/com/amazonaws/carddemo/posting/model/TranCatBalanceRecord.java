package com.amazonaws.carddemo.posting.model;

import java.math.BigDecimal;

public record TranCatBalanceRecord(String acctId, String typeCd, String catCd, BigDecimal balance) {
    public String key() {
        return acctId + typeCd + catCd;
    }

    public TranCatBalanceRecord withBalance(BigDecimal newBalance) {
        return new TranCatBalanceRecord(acctId, typeCd, catCd, newBalance);
    }
}
