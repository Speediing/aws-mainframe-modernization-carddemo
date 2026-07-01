package com.amazonaws.carddemo.posting;

import com.amazonaws.carddemo.posting.model.AccountRecord;
import com.amazonaws.carddemo.posting.model.PostedTransaction;
import com.amazonaws.carddemo.posting.model.RejectedTransaction;
import com.amazonaws.carddemo.posting.model.TranCatBalanceRecord;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Golden-file regression test for the CBTRN02C Java port.
 */
class DailyTransactionPostingGoldenTest {

    private static final Path GOLDEN = Path.of("src/test/resources/golden");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private DailyTransactionPostingService service;

    @BeforeEach
    void setUp() {
        Clock fixedClock = Clock.fixed(Instant.parse("2026-07-01T12:00:00Z"), ZoneOffset.UTC);
        service = new DailyTransactionPostingService(new Db2TimestampProvider(fixedClock));
    }

    @Test
    void postingMatchesGoldenFixture() throws Exception {
        var transactions = FixtureLoader.loadDailyTransactions(GOLDEN.resolve("input/dailytran.txt"));
        var cardXrefs = FixtureLoader.loadCardXrefs(GOLDEN.resolve("fixtures/cardxref.txt"));
        var accounts = FixtureLoader.loadAccounts(GOLDEN.resolve("fixtures/acctdata.txt"));
        var tcatBalances = FixtureLoader.loadTranCatBalances(GOLDEN.resolve("fixtures/tcatbal.txt"));

        PostingResult actual = service.process(transactions, accounts, cardXrefs, tcatBalances);
        JsonNode expected = MAPPER.readTree(GOLDEN.resolve("expected/posting-result.json").toFile());

        assertEquals(expected.get("processedCount").asInt(), actual.processedCount());
        assertEquals(expected.get("rejectCount").asInt(), actual.rejectCount());
        assertEquals(expected.get("returnCode").asInt(), actual.returnCode());

        assertPostedMatches(expected.get("posted"), actual.posted());
        assertRejectsMatch(expected.get("rejects"), actual.rejects());
        assertAccountsMatch(expected.get("accounts"), actual.accounts());
        assertTcatBalancesMatch(expected.get("tcatBalances"), actual.tcatBalances());
    }

    @Test
    void validationReasonCodesMatchCobolTable() {
        assertEquals(100, new TransactionValidator().validate(
                transaction("00000000001", "9999999999999999", "100.00"),
                Map.of(),
                Map.of()
        ).reasonCode());

        assertEquals(101, new TransactionValidator().validate(
                transaction("00000000002", "1111111111111111", "100.00"),
                Map.of("1111111111111111", new com.amazonaws.carddemo.posting.model.CardXrefRecord(
                        "1111111111111111", "000000001", "00000000999")),
                Map.of()
        ).reasonCode());
    }

    private static com.amazonaws.carddemo.posting.model.DailyTransaction transaction(
            String id, String cardNum, String amount) {
        return new com.amazonaws.carddemo.posting.model.DailyTransaction(
                id, "01", "0001", "POS TERM  ", "test",
                new BigDecimal(amount), "800000000", "Merchant", "City", "12345",
                cardNum, "2022-06-10 19:27:53.000000", " ".repeat(26), " ".repeat(350)
        );
    }

    private static void assertPostedMatches(JsonNode expected, List<PostedTransaction> actual) {
        assertEquals(expected.size(), actual.size());
        for (int i = 0; i < expected.size(); i++) {
            JsonNode exp = expected.get(i);
            PostedTransaction act = actual.get(i);
            assertEquals(exp.get("transactionId").asText(), act.transactionId());
            assertEquals(exp.get("cardNum").asText(), act.cardNum());
            assertEquals(exp.get("acctId").asText(), act.acctId());
            assertEquals(0, exp.get("amount").decimalValue().compareTo(act.amount()));
            assertEquals(exp.get("procTs").asText(), act.procTs());
        }
    }

    private static void assertRejectsMatch(JsonNode expected, List<RejectedTransaction> actual) {
        assertEquals(expected.size(), actual.size());
        for (int i = 0; i < expected.size(); i++) {
            JsonNode exp = expected.get(i);
            RejectedTransaction act = actual.get(i);
            assertEquals(exp.get("transactionId").asText(), act.transactionId());
            assertEquals(exp.get("reasonCode").asInt(), act.reasonCode());
            assertEquals(exp.get("reasonDescription").asText(), act.reasonDescription());
            assertEquals(exp.get("cardNum").asText(), act.cardNum());
            assertEquals(0, exp.get("amount").decimalValue().compareTo(act.amount()));
        }
    }

    private static void assertAccountsMatch(JsonNode expected, Map<String, AccountRecord> actual) {
        Iterator<String> fieldNames = expected.fieldNames();
        while (fieldNames.hasNext()) {
            String acctId = fieldNames.next();
            assertTrue(actual.containsKey(acctId), "Missing account " + acctId);
            JsonNode exp = expected.get(acctId);
            AccountRecord act = actual.get(acctId);
            assertEquals(0, exp.get("currBal").decimalValue().compareTo(act.currBal()));
            assertEquals(0, exp.get("creditLimit").decimalValue().compareTo(act.creditLimit()));
            assertEquals(exp.get("expirationDate").asText(), act.expirationDate());
            assertEquals(0, exp.get("currCycCredit").decimalValue().compareTo(act.currCycCredit()));
            assertEquals(0, exp.get("currCycDebit").decimalValue().compareTo(act.currCycDebit()));
        }
    }

    private static void assertTcatBalancesMatch(JsonNode expected, List<TranCatBalanceRecord> actual) {
        List<TranCatBalanceRecord> sortedActual = actual.stream()
                .sorted(Comparator.comparing(TranCatBalanceRecord::key))
                .toList();
        assertEquals(expected.size(), sortedActual.size());
        for (int i = 0; i < expected.size(); i++) {
            JsonNode exp = expected.get(i);
            TranCatBalanceRecord act = sortedActual.get(i);
            assertEquals(exp.get("acctId").asText(), act.acctId());
            assertEquals(exp.get("typeCd").asText(), act.typeCd());
            assertEquals(exp.get("catCd").asText(), act.catCd());
            assertEquals(0, exp.get("balance").decimalValue().compareTo(act.balance()));
        }
    }
}
