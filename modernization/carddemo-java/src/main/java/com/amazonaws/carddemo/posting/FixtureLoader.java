package com.amazonaws.carddemo.posting;

import com.amazonaws.carddemo.cobol.FixedWidthRecords;
import com.amazonaws.carddemo.posting.model.AccountRecord;
import com.amazonaws.carddemo.posting.model.CardXrefRecord;
import com.amazonaws.carddemo.posting.model.DailyTransaction;
import com.amazonaws.carddemo.posting.model.TranCatBalanceRecord;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public final class FixtureLoader {

    private FixtureLoader() {
    }

    public static List<DailyTransaction> loadDailyTransactions(Path path) throws IOException {
        return Files.readAllLines(path).stream()
                .filter(line -> !line.isBlank())
                .map(FixedWidthRecords::parseDailyTransaction)
                .collect(Collectors.toList());
    }

    public static Map<String, CardXrefRecord> loadCardXrefs(Path path) throws IOException {
        Map<String, CardXrefRecord> map = new LinkedHashMap<>();
        for (String line : Files.readAllLines(path)) {
            if (line.isBlank()) {
                continue;
            }
            CardXrefRecord record = FixedWidthRecords.parseCardXref(line);
            map.put(record.cardNum(), record);
        }
        return map;
    }

    public static Map<String, AccountRecord> loadAccounts(Path path) throws IOException {
        Map<String, AccountRecord> map = new LinkedHashMap<>();
        for (String line : Files.readAllLines(path)) {
            if (line.isBlank()) {
                continue;
            }
            AccountRecord record = FixedWidthRecords.parseAccount(line);
            map.put(record.acctId(), record);
        }
        return map;
    }

    public static Map<String, TranCatBalanceRecord> loadTranCatBalances(Path path) throws IOException {
        Map<String, TranCatBalanceRecord> map = new LinkedHashMap<>();
        for (String line : Files.readAllLines(path)) {
            if (line.isBlank()) {
                continue;
            }
            TranCatBalanceRecord record = FixedWidthRecords.parseTranCatBalance(line);
            map.put(record.key(), record);
        }
        return map;
    }
}
