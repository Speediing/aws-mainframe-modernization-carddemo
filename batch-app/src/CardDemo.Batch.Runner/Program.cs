using CardDemo.Batch.Core.Jobs;
using CardDemo.Batch.Core.Models;
using CardDemo.Batch.Core.Services;

if (args.Length == 0)
{
    PrintUsage();
    return 1;
}

var jobName = args[0].ToLowerInvariant();
if (!BatchJobCatalog.LegacyProgramMap.TryGetValue(jobName, out var legacyProgram))
{
    Console.Error.WriteLine($"Unknown batch job '{jobName}'.");
    PrintUsage();
    return 1;
}

Console.WriteLine($"Running modernized batch job '{jobName}' (legacy {legacyProgram}) on .NET 8.");

switch (jobName)
{
    case "post-transactions":
        RunPostTransactionsDemo();
        break;
    case "calculate-interest":
        RunInterestCalculationDemo();
        break;
    case "transaction-report":
        Console.WriteLine("Transaction report generation is not yet implemented.");
        break;
    default:
        Console.Error.WriteLine($"Job '{jobName}' is registered but has no runner implementation.");
        return 1;
}

return 0;

static void RunPostTransactionsDemo()
{
    var accounts = new Dictionary<long, AccountRecord>
    {
        [1] = new AccountRecord
        {
            AccountId = 1,
            IsActive = true,
            CurrentBalance = 100m,
            CreditLimit = 5000m,
            CashCreditLimit = 1000m,
            GroupId = "A000000000",
        },
    };

    var crossReferences = new Dictionary<string, CardCrossReference>
    {
        ["4111111111111111"] = new CardCrossReference
        {
            CardNumber = "4111111111111111",
            CustomerId = 1001,
            AccountId = 1,
        },
    };

    var dailyTransactions = new[]
    {
        new TransactionRecord
        {
            TransactionId = "TX00000000000001",
            TypeCode = "01",
            CategoryCode = 101,
            Description = "Grocery purchase",
            Amount = -25.50m,
            CardNumber = "4111111111111111",
            AccountId = 0,
        },
    };

    var postingService = new TransactionPostingService();
    var result = postingService.PostDailyTransactions(dailyTransactions, crossReferences, accounts);

    Console.WriteLine($"Posted: {result.PostedTransactions.Count}, Rejected: {result.RejectedTransactions.Count}");
    Console.WriteLine($"Updated balance: {accounts[1].CurrentBalance:F2}");
}

static void RunInterestCalculationDemo()
{
    var accounts = new[]
    {
        new AccountRecord
        {
            AccountId = 1,
            IsActive = true,
            CurrentBalance = 1200m,
            CreditLimit = 5000m,
            CashCreditLimit = 1000m,
            GroupId = "A000000000",
        },
    };

    var interestService = new InterestCalculationService();
    var updated = interestService.ApplyMonthlyInterest(accounts, annualRatePercent: 18m);

    Console.WriteLine($"Interest applied. New balance: {updated[0].CurrentBalance:F2}");
}

static void PrintUsage()
{
    Console.WriteLine("Usage: CardDemo.Batch.Runner <job-name>");
    Console.WriteLine("Jobs:");
    foreach (var (job, legacy) in BatchJobCatalog.LegacyProgramMap)
    {
        Console.WriteLine($"  {job} (legacy {legacy})");
    }
}
