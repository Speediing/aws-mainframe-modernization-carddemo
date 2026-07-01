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
            ["read-account"] = "CBACT01C",
            ["read-card"] = "CBACT02C",
            ["read-xref"] = "CBACT03C",
            ["read-customer"] = "CBCUS01C",
            ["create-statement"] = "CBSTM03A",
            ["export-data"] = "CBEXPORT",
            ["import-data"] = "CBIMPORT",
        };
}
