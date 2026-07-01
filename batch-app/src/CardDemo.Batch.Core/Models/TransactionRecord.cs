namespace CardDemo.Batch.Core.Models;

/// <summary>
/// Modernized representation of CVTRA05Y / CVTRA06Y transaction entity.
/// </summary>
public sealed class TransactionRecord
{
    public required string TransactionId { get; init; }

    public required string TypeCode { get; init; }

    public required int CategoryCode { get; init; }

    public required string Description { get; init; }

    public required decimal Amount { get; init; }

    public required string CardNumber { get; init; }

    public required long AccountId { get; init; }
}
