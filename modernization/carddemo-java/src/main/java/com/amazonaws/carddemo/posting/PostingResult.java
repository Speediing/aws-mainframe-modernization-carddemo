package com.amazonaws.carddemo.posting;

import com.amazonaws.carddemo.posting.model.AccountRecord;
import com.amazonaws.carddemo.posting.model.PostedTransaction;
import com.amazonaws.carddemo.posting.model.RejectedTransaction;
import com.amazonaws.carddemo.posting.model.TranCatBalanceRecord;

import java.util.List;
import java.util.Map;

public record PostingResult(
        int processedCount,
        int rejectCount,
        int returnCode,
        List<PostedTransaction> posted,
        List<RejectedTransaction> rejects,
        Map<String, AccountRecord> accounts,
        List<TranCatBalanceRecord> tcatBalances
) {
}
