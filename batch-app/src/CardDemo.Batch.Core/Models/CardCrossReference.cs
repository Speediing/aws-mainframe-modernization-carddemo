namespace CardDemo.Batch.Core.Models;

/// <summary>
/// Modernized representation of CVACT03Y card cross-reference entity.
/// </summary>
public sealed class CardCrossReference
{
    public required string CardNumber { get; init; }

    public required long CustomerId { get; init; }

    public required long AccountId { get; init; }
}
