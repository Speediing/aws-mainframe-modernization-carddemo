package com.amazonaws.carddemo.posting;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Produces DB2-style timestamps matching CBTRN02C {@code Z-GET-DB2-FORMAT-TIMESTAMP}.
 */
public final class Db2TimestampProvider {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd-HH.mm.ss.SSSSSS");

    private final Clock clock;

    public Db2TimestampProvider(Clock clock) {
        this.clock = clock;
    }

    public String now() {
        return LocalDateTime.now(clock).format(FORMATTER);
    }
}
