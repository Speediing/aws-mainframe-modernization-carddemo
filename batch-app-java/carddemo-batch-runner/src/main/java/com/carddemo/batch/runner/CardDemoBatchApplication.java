package com.carddemo.batch.runner;

import com.carddemo.batch.core.BatchCoreConfiguration;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@Import(BatchCoreConfiguration.class)
public class CardDemoBatchApplication {

    public static void main(String[] args) {
        int exitCode = SpringApplication.exit(SpringApplication.run(CardDemoBatchApplication.class, args));
        System.exit(exitCode);
    }
}
