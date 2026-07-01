package com.carddemo.batch.core.jobs;

import java.util.Map;

/**
 * Maps modernized Java batch jobs to legacy JCL/COBOL programs.
 */
public final class BatchJobCatalog {

    private BatchJobCatalog() {
    }

    public static final Map<String, String> LEGACY_PROGRAM_MAP = Map.of(
            "post-transactions", "CBTRN02C",
            "calculate-interest", "CBACT04C",
            "transaction-report", "CBTRN03C");

    public static boolean isKnownJob(String jobName) {
        return LEGACY_PROGRAM_MAP.containsKey(jobName.toLowerCase());
    }

    public static String legacyProgramFor(String jobName) {
        return LEGACY_PROGRAM_MAP.get(jobName.toLowerCase());
    }
}
