using CardDemo.Batch.Core.Models;

namespace CardDemo.Batch.Core.Services;

/// <summary>
/// Modernized batch logic from CBACT04C interest calculation.
/// </summary>
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
