package com.amazonaws.carddemo.posting;

import com.amazonaws.carddemo.posting.model.AccountRecord;
import com.amazonaws.carddemo.posting.model.DailyTransaction;
import com.amazonaws.carddemo.posting.model.PostedTransaction;
import com.amazonaws.carddemo.posting.model.RejectedTransaction;
import com.amazonaws.carddemo.posting.model.TranCatBalanceRecord;
import com.amazonaws.carddemo.posting.model.ValidationResult;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Port of CBTRN02C daily transaction posting batch logic.
 */
public final class DailyTransactionPostingService {

    private final TransactionValidator validator = new TransactionValidator();
    private final Db2TimestampProvider timestampProvider;

    public DailyTransactionPostingService(Db2TimestampProvider timestampProvider) {
        this.timestampProvider = timestampProvider;
    }

    public PostingResult process(
            List<DailyTransaction> transactions,
            Map<String, AccountRecord> accounts,
            Map<String, com.amazonaws.carddemo.posting.model.CardXrefRecord> cardXrefs,
            Map<String, TranCatBalanceRecord> tcatBalances) {

        Map<String, AccountRecord> mutableAccounts = new LinkedHashMap<>();
        accounts.forEach((key, value) -> mutableAccounts.put(key, value));

        Map<String, TranCatBalanceRecord> mutableTcatBalances = new HashMap<>(tcatBalances);
        List<PostedTransaction> posted = new ArrayList<>();
        List<RejectedTransaction> rejects = new ArrayList<>();

        for (DailyTransaction transaction : transactions) {
            ValidationResult validation = validator.validate(transaction, cardXrefs, mutableAccounts);
            if (!validation.isValid()) {
                rejects.add(new RejectedTransaction(
                        transaction.id(),
                        validation.reasonCode(),
                        validation.reasonDescription(),
                        transaction.cardNum(),
                        transaction.amount()
                ));
                continue;
            }

            com.amazonaws.carddemo.posting.model.CardXrefRecord xref = cardXrefs.get(transaction.cardNum());
            AccountRecord account = mutableAccounts.get(xref.acctId());
            String procTs = timestampProvider.now();

            updateTranCatBalance(mutableTcatBalances, xref.acctId(), transaction);
            AccountRecord updatedAccount = updateAccount(mutableAccounts, account, transaction);
            if (updatedAccount == null) {
                rejects.add(new RejectedTransaction(
                        transaction.id(),
                        109,
                        "ACCOUNT RECORD NOT FOUND",
                        transaction.cardNum(),
                        transaction.amount()
                ));
                continue;
            }

            posted.add(new PostedTransaction(
                    transaction.id(),
                    transaction.cardNum(),
                    xref.acctId(),
                    transaction.amount(),
                    procTs
            ));
        }

        int rejectCount = rejects.size();
        return new PostingResult(
                transactions.size(),
                rejectCount,
                rejectCount > 0 ? 4 : 0,
                posted,
                rejects,
                mutableAccounts,
                new ArrayList<>(mutableTcatBalances.values())
        );
    }

    private void updateTranCatBalance(
            Map<String, TranCatBalanceRecord> tcatBalances,
            String acctId,
            DailyTransaction transaction) {

        String key = acctId + transaction.typeCd() + transaction.catCd();
        TranCatBalanceRecord existing = tcatBalances.get(key);
        if (existing == null) {
            tcatBalances.put(key, new TranCatBalanceRecord(
                    acctId,
                    transaction.typeCd(),
                    transaction.catCd(),
                    transaction.amount()
            ));
        } else {
            tcatBalances.put(key, existing.withBalance(existing.balance().add(transaction.amount())));
        }
    }

    private AccountRecord updateAccount(
            Map<String, AccountRecord> accounts,
            AccountRecord account,
            DailyTransaction transaction) {

        if (account == null) {
            return null;
        }

        BigDecimal newCurrBal = account.currBal().add(transaction.amount());
        BigDecimal newCycCredit = account.currCycCredit();
        BigDecimal newCycDebit = account.currCycDebit();

        if (transaction.amount().signum() >= 0) {
            newCycCredit = newCycCredit.add(transaction.amount());
        } else {
            newCycDebit = newCycDebit.add(transaction.amount());
        }

        AccountRecord updated = account.withUpdatedBalances(newCurrBal, newCycCredit, newCycDebit);
        accounts.put(account.acctId(), updated);
        return updated;
    }
}
