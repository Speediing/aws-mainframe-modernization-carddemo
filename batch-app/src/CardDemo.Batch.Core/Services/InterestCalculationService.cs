using CardDemo.Batch.Core.Models;

namespace CardDemo.Batch.Core.Services;

/// <summary>
/// Modernized batch logic from CBACT04C interest calculation.
/// </summary>
/// <remarks>
/// <para>
/// CBACT04C iterates the TCATBAL (transaction category balance) VSAM file and computes
/// monthly interest per category using each record's <c>TRAN-CAT-BAL</c> and the
/// disclosure-group rate (<c>DIS-INT-RATE / 1200</c>).
/// </para>
/// <para>
/// This modernized service applies a deliberate simplification: it uses
/// <see cref="AccountRecord.CurrentBalance"/> (account-level net balance) instead of
/// per-category TCATBAL balances, and applies a single supplied annual rate rather
/// than looking up category-specific rates from the disclosure group file.
/// </para>
/// </remarks>
public sealed class InterestCalculationService
{
    public decimal CalculateMonthlyInterest(decimal balance, decimal annualRatePercent)
    {
        if (balance <= 0m)
        {
            return 0m;
        }

        if (annualRatePercent < 0m)
        {
            throw new ArgumentOutOfRangeException(nameof(annualRatePercent));
        }

        return Math.Round(balance * (annualRatePercent / 100m) / 12m, 2, MidpointRounding.AwayFromZero);
    }

    /// <summary>
    /// Applies monthly interest to active accounts using each account's
    /// <see cref="AccountRecord.CurrentBalance"/> rather than per-category TCATBAL records.
    /// </summary>
    public IReadOnlyList<AccountRecord> ApplyMonthlyInterest(
        IEnumerable<AccountRecord> accounts,
        decimal annualRatePercent)
    {
        var updatedAccounts = new List<AccountRecord>();

        foreach (var account in accounts)
        {
            if (!account.IsActive)
            {
                updatedAccounts.Add(account);
                continue;
            }

            var interest = CalculateMonthlyInterest(account.CurrentBalance, annualRatePercent);
            account.CurrentBalance += interest;
            updatedAccounts.Add(account);
        }

        return updatedAccounts;
    }
}
