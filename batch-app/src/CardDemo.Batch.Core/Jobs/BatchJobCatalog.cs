namespace CardDemo.Batch.Core.Jobs;

/// <summary>
/// Maps modernized .NET batch jobs to legacy JCL/COBOL programs.
/// </summary>
public static class BatchJobCatalog
{
    public static readonly IReadOnlyDictionary<string, string> LegacyProgramMap =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["post-transactions"] = "CBTRN02C",
            ["calculate-interest"] = "CBACT04C",
            ["transaction-report"] = "CBTRN03C",
        };
}
