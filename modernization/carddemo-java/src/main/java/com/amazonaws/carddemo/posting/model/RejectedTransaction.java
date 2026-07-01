package com.amazonaws.carddemo.posting.model;

import java.math.BigDecimal;

public record RejectedTransaction(
        String transactionId,
        int reasonCode,
        String reasonDescription,
        String cardNum,
        BigDecimal amount
) {
}
