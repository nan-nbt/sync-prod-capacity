package com.example.capacity;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertEquals;

class TransferTransactionTest {
    @Test
    void transferUsesRepeatableReadTransaction() throws NoSuchMethodException {
        Method transfer = CapacityTransfer.class.getMethod("transfer", DaysWindow.class);
        Transactional annotation = transfer.getAnnotation(Transactional.class);

        assertEquals(Isolation.REPEATABLE_READ, annotation.isolation());
        assertEquals(TransactionDefinition.ISOLATION_REPEATABLE_READ,
                annotation.isolation().value());
    }
}
