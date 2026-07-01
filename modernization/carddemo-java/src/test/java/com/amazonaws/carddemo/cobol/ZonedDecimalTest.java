package com.amazonaws.carddemo.cobol;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ZonedDecimalTest {

    @Test
    void parsesAndFormatsCobolOverpunch() {
        assertEquals(new BigDecimal("504.77"), ZonedDecimal.parse("0000005047G"));
        assertEquals(new BigDecimal("-919.00"), ZonedDecimal.parse("0000009190}"));
        assertEquals(new BigDecimal("1940.00"), ZonedDecimal.parse("00000019400{"));
        assertEquals(new BigDecimal("20200.00"), ZonedDecimal.parse("00000202000{"));

        assertEquals("0000005047G", ZonedDecimal.format(new BigDecimal("504.77"), 11));
        assertEquals("0000009190}", ZonedDecimal.format(new BigDecimal("-919.00"), 11));
    }
}
