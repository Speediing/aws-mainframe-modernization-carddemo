package com.amazonaws.carddemo.posting;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Produces DB2-style timestamps matching CBTRN02C {@code Z-GET-DB2-FORMAT-TIMESTAMP}.
 */
public final class Db2TimestampProvider {

    private static final DateTimeFormatter BASE_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd-HH.mm.ss");

    private final Clock clock;

    public Db2TimestampProvider(Clock clock) {
        this.clock = clock;
    }

    public String now() {
        LocalDateTime dateTime = LocalDateTime.now(clock);
        int millis = dateTime.getNano() / 1_000_000;
        return dateTime.format(BASE_FORMATTER) + "." + String.format("%03d000", millis);
    }
}
