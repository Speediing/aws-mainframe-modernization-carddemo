namespace CardDemo.Batch.Core.Models;

/// <summary>
/// Modernized representation of CVACT01Y account entity.
/// </summary>
public sealed class AccountRecord
{
    public required long AccountId { get; init; }

    public required bool IsActive { get; init; }

    public required decimal CurrentBalance { get; set; }

    public required decimal CreditLimit { get; init; }

    public required decimal CashCreditLimit { get; init; }

    public required string GroupId { get; init; }
}
