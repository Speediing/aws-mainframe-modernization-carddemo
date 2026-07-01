package com.amazonaws.carddemo.posting.model;

import java.math.BigDecimal;

public record PostedTransaction(
        String transactionId,
        String cardNum,
        String acctId,
        BigDecimal amount,
        String procTs
) {
}
