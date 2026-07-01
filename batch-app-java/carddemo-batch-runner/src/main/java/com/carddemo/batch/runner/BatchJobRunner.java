package com.carddemo.batch.runner;

import com.carddemo.batch.core.jobs.BatchJobCatalog;
import com.carddemo.batch.core.models.AccountRecord;
import com.carddemo.batch.core.models.CardCrossReference;
import com.carddemo.batch.core.models.TransactionPostingResult;
import com.carddemo.batch.core.models.TransactionRecord;
import com.carddemo.batch.core.services.InterestCalculationService;
import com.carddemo.batch.core.services.TransactionPostingService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@ConditionalOnProperty(name = "carddemo.batch.job")
public class BatchJobRunner implements CommandLineRunner {

    private final InterestCalculationService interestCalculationService;
    private final TransactionPostingService transactionPostingService;

    public BatchJobRunner(
            InterestCalculationService interestCalculationService,
            TransactionPostingService transactionPostingService) {
        this.interestCalculationService = interestCalculationService;
        this.transactionPostingService = transactionPostingService;
    }

    @Override
    public void run(String... args) {
        String jobName = System.getProperty("carddemo.batch.job");
        if (jobName == null || jobName.isBlank()) {
            return;
        }

        if (!BatchJobCatalog.isKnownJob(jobName)) {
            System.err.printf("Unknown batch job '%s'.%n", jobName);
            printUsage();
            throw new IllegalArgumentException("Unknown batch job: " + jobName);
        }

        String legacyProgram = BatchJobCatalog.legacyProgramFor(jobName);
        System.out.printf(
                "Running modernized batch job '%s' (legacy %s) on Java 21 + Spring Boot 3.3.%n",
                jobName,
                legacyProgram);

        switch (jobName.toLowerCase()) {
            case "post-transactions" -> runPostTransactionsDemo();
            case "calculate-interest" -> runInterestCalculationDemo();
            case "transaction-report" ->
                    System.out.println("Transaction report generation is not yet implemented.");
            default -> throw new IllegalStateException("Job registered but not implemented: " + jobName);
        }
    }

    private void runPostTransactionsDemo() {
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

        List<TransactionRecord> dailyTransactions = List.of(new TransactionRecord(
                "TX00000000000001",
                "01",
                101,
                "Grocery purchase",
                new BigDecimal("-25.50"),
                "4111111111111111",
                0L));

        TransactionPostingResult result = transactionPostingService.postDailyTransactions(
                dailyTransactions, crossReferences, accounts);

        System.out.printf("Posted %d transactions.%n", result.postedTransactions().size());
        System.out.printf("Rejected %d transactions.%n", result.rejectedTransactions().size());
        System.out.printf("Updated account balance: %s%n", accounts.get(1L).getCurrentBalance());
    }

    private void runInterestCalculationDemo() {
        List<AccountRecord> accounts = List.of(new AccountRecord(
                1L,
                true,
                new BigDecimal("600.00"),
                new BigDecimal("1000.00"),
                new BigDecimal("100.00"),
                "A000000000"));

        List<AccountRecord> updated = interestCalculationService.applyMonthlyInterest(
                accounts, new BigDecimal("12.00"));

        System.out.printf("Updated account balance after interest: %s%n", updated.get(0).getCurrentBalance());
    }

    private static void printUsage() {
        System.out.println("Supported jobs:");
        BatchJobCatalog.LEGACY_PROGRAM_MAP.forEach((job, legacy) ->
                System.out.printf("  %s (legacy %s)%n", job, legacy));
    }
}
