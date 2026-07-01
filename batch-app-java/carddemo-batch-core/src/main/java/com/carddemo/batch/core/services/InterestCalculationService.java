package com.carddemo.batch.core.services;

import com.carddemo.batch.core.models.AccountRecord;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Modernized batch logic from CBACT04C interest calculation.
 */
@Service
public class InterestCalculationService {

    public BigDecimal calculateMonthlyInterest(BigDecimal balance, BigDecimal annualRatePercent) {
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }

        if (annualRatePercent.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("annualRatePercent must be non-negative");
        }

        return balance
                .multiply(annualRatePercent)
                .divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP)
                .divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
    }

    public List<AccountRecord> applyMonthlyInterest(
            Iterable<AccountRecord> accounts,
            BigDecimal annualRatePercent) {
        List<AccountRecord> updatedAccounts = new ArrayList<>();

        for (AccountRecord account : accounts) {
            if (!account.isActive()) {
                updatedAccounts.add(account);
                continue;
            }

            BigDecimal interest = calculateMonthlyInterest(account.getCurrentBalance(), annualRatePercent);
            account.setCurrentBalance(account.getCurrentBalance().add(interest));
            updatedAccounts.add(account);
        }

        return updatedAccounts;
    }
}
