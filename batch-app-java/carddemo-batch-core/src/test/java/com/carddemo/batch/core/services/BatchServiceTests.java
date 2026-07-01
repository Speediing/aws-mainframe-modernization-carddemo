package com.carddemo.batch.core.services;

import com.carddemo.batch.core.models.AccountRecord;
import com.carddemo.batch.core.models.CardCrossReference;
import com.carddemo.batch.core.models.TransactionPostingResult;
import com.carddemo.batch.core.models.TransactionRecord;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class InterestCalculationServiceTest {

    private final InterestCalculationService service = new InterestCalculationService();

    @Test
    void calculateMonthlyInterestReturnsZeroForZeroBalance() {
        BigDecimal interest = service.calculateMonthlyInterest(BigDecimal.ZERO, new BigDecimal("18.00"));
        assertEquals(0, interest.compareTo(BigDecimal.ZERO));
    }

    @Test
    void calculateMonthlyInterestComputesExpectedAmount() {
        BigDecimal interest = service.calculateMonthlyInterest(new BigDecimal("1200.00"), new BigDecimal("18.00"));
        assertEquals(new BigDecimal("18.00"), interest);
    }

    @Test
    void calculateMonthlyInterestMatchesCobolCbact04cFormula() {
        // CBACT04C 1300-COMPUTE-INTEREST: WS-MONTHLY-INT = (TRAN-CAT-BAL * DIS-INT-RATE) / 1200
        BigDecimal interest = service.calculateMonthlyInterest(new BigDecimal("2500.00"), new BigDecimal("15.50"));
        assertEquals(new BigDecimal("32.29"), interest);
    }

    @Test
    void calculateMonthlyInterestRejectsNegativeRate() {
        assertThrows(IllegalArgumentException.class, () ->
                service.calculateMonthlyInterest(new BigDecimal("100.00"), new BigDecimal("-1.00")));
    }

    @Test
    void applyMonthlyInterestSkipsInactiveAccounts() {
        AccountRecord account = new AccountRecord(
                1L,
                false,
                new BigDecimal("500.00"),
                new BigDecimal("1000.00"),
                new BigDecimal("100.00"),
                "A000000000");

        List<AccountRecord> updated = service.applyMonthlyInterest(List.of(account), new BigDecimal("12.00"));
        assertEquals(new BigDecimal("500.00"), updated.get(0).getCurrentBalance());
    }

    @Test
    void applyMonthlyInterestUpdatesActiveAccounts() {
        AccountRecord account = new AccountRecord(
                1L,
                true,
                new BigDecimal("600.00"),
                new BigDecimal("1000.00"),
                new BigDecimal("100.00"),
                "A000000000");

        List<AccountRecord> updated = service.applyMonthlyInterest(List.of(account), new BigDecimal("12.00"));
        assertEquals(new BigDecimal("606.00"), updated.get(0).getCurrentBalance());
    }
}

class TransactionPostingServiceTest {

    private final TransactionPostingService service = new TransactionPostingService();

    @Test
    void postDailyTransactionsPostsValidTransaction() {
        Map<Long, AccountRecord> accounts = new HashMap<>();
        accounts.put(1L, new AccountRecord(
                1L,
                true,
                new BigDecimal("100.00"),
                new BigDecimal("5000.00"),
                new BigDecimal("1000.00"),
                "A000000000"));

        Map<String, CardCrossReference> crossReferences = Map.of(
                "4111111111111111",
                new CardCrossReference("4111111111111111", 1001L, 1L));

        List<TransactionRecord> transactions = List.of(createTransaction("4111111111111111", new BigDecimal("-10.00")));

        TransactionPostingResult result = service.postDailyTransactions(transactions, crossReferences, accounts);

        assertEquals(1, result.postedTransactions().size());
        assertEquals(0, result.rejectedTransactions().size());
        assertEquals(new BigDecimal("90.00"), accounts.get(1L).getCurrentBalance());
    }

    @Test
    void postDailyTransactionsRejectsUnknownCard() {
        Map<Long, AccountRecord> accounts = new HashMap<>();
        Map<String, CardCrossReference> crossReferences = Map.of();
        List<TransactionRecord> transactions = List.of(createTransaction("9999999999999999", new BigDecimal("-10.00")));

        TransactionPostingResult result = service.postDailyTransactions(transactions, crossReferences, accounts);

        assertEquals(0, result.postedTransactions().size());
        assertEquals(1, result.rejectedTransactions().size());
    }

    @Test
    void postDailyTransactionsRejectsOverlimitTransaction() {
        Map<Long, AccountRecord> accounts = new HashMap<>();
        accounts.put(1L, new AccountRecord(
                1L,
                true,
                new BigDecimal("4999.00"),
                new BigDecimal("5000.00"),
                new BigDecimal("1000.00"),
                "A000000000"));

        Map<String, CardCrossReference> crossReferences = Map.of(
                "4111111111111111",
                new CardCrossReference("4111111111111111", 1001L, 1L));

        List<TransactionRecord> transactions = List.of(createTransaction("4111111111111111", new BigDecimal("2.00")));
        TransactionPostingResult result = service.postDailyTransactions(transactions, crossReferences, accounts);

        assertEquals(0, result.postedTransactions().size());
        assertEquals(1, result.rejectedTransactions().size());
        assertEquals(new BigDecimal("4999.00"), accounts.get(1L).getCurrentBalance());
    }

    @Test
    void postDailyTransactionsRejectsInactiveAccount() {
        Map<Long, AccountRecord> accounts = new HashMap<>();
        accounts.put(1L, new AccountRecord(
                1L,
                false,
                new BigDecimal("100.00"),
                new BigDecimal("5000.00"),
                new BigDecimal("1000.00"),
                "A000000000"));

        Map<String, CardCrossReference> crossReferences = Map.of(
                "4111111111111111",
                new CardCrossReference("4111111111111111", 1001L, 1L));

        List<TransactionRecord> transactions = List.of(createTransaction("4111111111111111", new BigDecimal("-10.00")));
        TransactionPostingResult result = service.postDailyTransactions(transactions, crossReferences, accounts);

        assertEquals(0, result.postedTransactions().size());
        assertEquals(1, result.rejectedTransactions().size());
        assertEquals(new BigDecimal("100.00"), accounts.get(1L).getCurrentBalance());
    }

    private static TransactionRecord createTransaction(String cardNumber, BigDecimal amount) {
        return new TransactionRecord(
                "TX00000000000001",
                "01",
                101,
                "Test transaction",
                amount,
                cardNumber,
                0L);
    }
}
