package com.carddemo.batch.core.services;

import com.carddemo.batch.core.models.AccountRecord;
import com.carddemo.batch.core.models.CardCrossReference;
import com.carddemo.batch.core.models.TransactionPostingResult;
import com.carddemo.batch.core.models.TransactionRecord;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Modernized batch logic from CBTRN02C transaction posting.
 */
@Service
public class TransactionPostingService {

    public TransactionPostingResult postDailyTransactions(
            Iterable<TransactionRecord> dailyTransactions,
            Map<String, CardCrossReference> cardCrossReferences,
            Map<Long, AccountRecord> accounts) {
        List<TransactionRecord> posted = new ArrayList<>();
        List<TransactionRecord> rejected = new ArrayList<>();

        for (TransactionRecord transaction : dailyTransactions) {
            CardCrossReference crossReference = cardCrossReferences.get(transaction.getCardNumber());
            if (crossReference == null) {
                rejected.add(transaction);
                continue;
            }

            AccountRecord account = accounts.get(crossReference.getAccountId());
            if (account == null) {
                rejected.add(transaction);
                continue;
            }

            if (!account.isActive()) {
                rejected.add(transaction);
                continue;
            }

            account.setCurrentBalance(account.getCurrentBalance().add(transaction.getAmount()));
            posted.add(transaction.withAccountId(crossReference.getAccountId()));
        }

        return new TransactionPostingResult(List.copyOf(posted), List.copyOf(rejected));
    }
}
