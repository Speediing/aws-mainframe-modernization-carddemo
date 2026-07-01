using CardDemo.Batch.Core.Models;

namespace CardDemo.Batch.Core.Services;

/// <summary>
/// Modernized batch logic from CBTRN02C transaction posting.
/// </summary>
public sealed class TransactionPostingService
{
    public TransactionPostingResult PostDailyTransactions(
        IEnumerable<TransactionRecord> dailyTransactions,
        IReadOnlyDictionary<string, CardCrossReference> cardCrossReferences,
        IDictionary<long, AccountRecord> accounts)
    {
        var posted = new List<TransactionRecord>();
        var rejected = new List<TransactionRecord>();

        foreach (var transaction in dailyTransactions)
        {
            if (!cardCrossReferences.TryGetValue(transaction.CardNumber, out var crossReference))
            {
                rejected.Add(transaction);
                continue;
            }

            if (!accounts.TryGetValue(crossReference.AccountId, out var account))
            {
                rejected.Add(transaction);
                continue;
            }

            if (!account.IsActive)
            {
                rejected.Add(transaction);
                continue;
            }

            account.CurrentBalance += transaction.Amount;
            posted.Add(new TransactionRecord
            {
                TransactionId = transaction.TransactionId,
                TypeCode = transaction.TypeCode,
                CategoryCode = transaction.CategoryCode,
                Description = transaction.Description,
                Amount = transaction.Amount,
                CardNumber = transaction.CardNumber,
                AccountId = crossReference.AccountId,
            });
        }

        return new TransactionPostingResult(posted, rejected);
    }
}

public sealed record TransactionPostingResult(
    IReadOnlyList<TransactionRecord> PostedTransactions,
    IReadOnlyList<TransactionRecord> RejectedTransactions);
