namespace CardDemo.Batch.Core.Models;

/// <summary>
/// Modernized representation of CVACT01Y account entity.
/// </summary>
public sealed class AccountRecord
{
    public required long AccountId { get; init; }

    /// <summary>
    /// Maps CVACT01Y <c>ACCT-ACTIVE-STATUS</c>: <c>Y</c> = active, <c>N</c> = inactive.
    /// </summary>
    public required bool IsActive { get; init; }

    public required decimal CurrentBalance { get; set; }

    public required decimal CreditLimit { get; init; }

    public required decimal CashCreditLimit { get; init; }

    public required string GroupId { get; init; }
}
