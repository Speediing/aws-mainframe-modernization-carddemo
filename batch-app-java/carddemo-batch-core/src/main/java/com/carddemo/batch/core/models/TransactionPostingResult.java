package com.carddemo.batch.core.models;

import java.util.List;

public record TransactionPostingResult(
        List<TransactionRecord> postedTransactions,
        List<TransactionRecord> rejectedTransactions) {
}
