using CardDemo.Batch.Core.Models;
using CardDemo.Batch.Core.Services;

namespace CardDemo.Batch.Tests;

public class InterestCalculationServiceTests
{
    private readonly InterestCalculationService _service = new();

    [Fact]
    public void CalculateMonthlyInterest_ReturnsZero_ForZeroBalance()
    {
        var interest = _service.CalculateMonthlyInterest(0m, 18m);
        Assert.Equal(0m, interest);
    }

    [Fact]
    public void CalculateMonthlyInterest_ComputesExpectedAmount()
    {
        var interest = _service.CalculateMonthlyInterest(1200m, 18m);
        Assert.Equal(18.00m, interest);
    }

    [Fact]
    public void ApplyMonthlyInterest_SkipsInactiveAccounts()
    {
        var accounts = new[]
        {
            new AccountRecord
            {
                AccountId = 1,
                IsActive = false,
                CurrentBalance = 500m,
                CreditLimit = 1000m,
                CashCreditLimit = 100m,
                GroupId = "A000000000",
            },
        };

        var updated = _service.ApplyMonthlyInterest(accounts, 12m);
        Assert.Equal(500m, updated[0].CurrentBalance);
    }

    [Fact]
    public void ApplyMonthlyInterest_UpdatesActiveAccounts()
    {
        var accounts = new[]
        {
            new AccountRecord
            {
                AccountId = 1,
                IsActive = true,
                CurrentBalance = 600m,
                CreditLimit = 1000m,
                CashCreditLimit = 100m,
                GroupId = "A000000000",
            },
        };

        var updated = _service.ApplyMonthlyInterest(accounts, 12m);
        Assert.Equal(606m, updated[0].CurrentBalance);
    }
}

public class TransactionPostingServiceTests
{
    private readonly TransactionPostingService _service = new();

    [Fact]
    public void PostDailyTransactions_PostsValidTransaction()
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

        var transactions = new[]
        {
            CreateTransaction("4111111111111111", -10m),
        };

        var result = _service.PostDailyTransactions(transactions, crossReferences, accounts);

        Assert.Single(result.PostedTransactions);
        Assert.Empty(result.RejectedTransactions);
        Assert.Equal(90m, accounts[1].CurrentBalance);
    }

    [Fact]
    public void PostDailyTransactions_RejectsUnknownCard()
    {
        var accounts = new Dictionary<long, AccountRecord>();
        var crossReferences = new Dictionary<string, CardCrossReference>();
        var transactions = new[] { CreateTransaction("9999999999999999", -10m) };

        var result = _service.PostDailyTransactions(transactions, crossReferences, accounts);

        Assert.Empty(result.PostedTransactions);
        Assert.Single(result.RejectedTransactions);
    }

    [Fact]
    public void PostDailyTransactions_RejectsOverlimitTransaction()
    {
        var accounts = new Dictionary<long, AccountRecord>
        {
            [1] = new AccountRecord
            {
                AccountId = 1,
                IsActive = true,
                CurrentBalance = 100m,
                CreditLimit = 100m,
                CashCreditLimit = 50m,
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

        var transactions = new[] { CreateTransaction("4111111111111111", 1m) };
        var result = _service.PostDailyTransactions(transactions, crossReferences, accounts);

        Assert.Empty(result.PostedTransactions);
        Assert.Single(result.RejectedTransactions);
        Assert.Equal(100m, accounts[1].CurrentBalance);
    }

    [Fact]
    public void PostDailyTransactions_RejectsInactiveAccount()
    {
        var accounts = new Dictionary<long, AccountRecord>
        {
            [1] = new AccountRecord
            {
                AccountId = 1,
                IsActive = false,
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

        var transactions = new[] { CreateTransaction("4111111111111111", -10m) };
        var result = _service.PostDailyTransactions(transactions, crossReferences, accounts);

        Assert.Empty(result.PostedTransactions);
        Assert.Single(result.RejectedTransactions);
        Assert.Equal(100m, accounts[1].CurrentBalance);
    }

    private static TransactionRecord CreateTransaction(string cardNumber, decimal amount) =>
        new()
        {
            TransactionId = "TX00000000000001",
            TypeCode = "01",
            CategoryCode = 101,
            Description = "Test transaction",
            Amount = amount,
            CardNumber = cardNumber,
            AccountId = 0,
        };
}
