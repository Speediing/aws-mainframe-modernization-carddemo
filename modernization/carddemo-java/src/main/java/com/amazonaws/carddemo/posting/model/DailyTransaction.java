package com.amazonaws.carddemo.posting.model;

import java.math.BigDecimal;

public record DailyTransaction(
        String id,
        String typeCd,
        String catCd,
        String source,
        String description,
        BigDecimal amount,
        String merchantId,
        String merchantName,
        String merchantCity,
        String merchantZip,
        String cardNum,
        String origTs,
        String procTs,
        String rawRecord
) {
    public String transactionDate() {
        return origTs.length() >= 10 ? origTs.substring(0, 10) : origTs;
    }
}
