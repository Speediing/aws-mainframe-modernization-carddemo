# syntax=docker/dockerfile:1

# Stage 1: Build deployment bundle and source inventory manifest.
FROM alpine:3.20 AS builder

WORKDIR /src

COPY app/ ./app/
COPY samples/ ./samples/
COPY scripts/ ./scripts/
COPY diagrams/ ./diagrams/
COPY README.md LICENSE NOTICE ./

RUN mkdir -p /artifacts \
    && find app -type f \( \
         -iname '*.cbl' -o -iname '*.jcl' -o -iname '*.bms' \
         -o -iname '*.cpy' -o -iname '*.csd' -o -iname '*.dbd' \
       \) | sort > /artifacts/source-inventory.txt \
    && { \
         echo "CardDemo source bundle"; \
         echo "version=1.0.0"; \
         echo "cobol_programs=$(find app -type f -iname '*.cbl' | wc -l | tr -d ' ')"; \
         echo "jcl_jobs=$(find app -type f -iname '*.jcl' | wc -l | tr -d ' ')"; \
         echo "bms_maps=$(find app -type f -iname '*.bms' | wc -l | tr -d ' ')"; \
         echo "copybooks=$(find app -type f -iname '*.cpy' | wc -l | tr -d ' ')"; \
         echo "online_entry_txn=CC00"; \
         echo "signon_program=COSGN00C"; \
         echo "batch_entry_job=POSTTRAN"; \
       } > /artifacts/manifest.txt \
    && tar -czf /artifacts/carddemo-bundle.tar.gz \
         app samples scripts diagrams README.md LICENSE NOTICE

# Stage 2: Minimal runtime image with CardDemo deployment artifacts.
FROM alpine:3.20 AS runtime

LABEL org.opencontainers.image.title="CardDemo" \
      org.opencontainers.image.description="AWS CardDemo mainframe credit card management application source bundle" \
      org.opencontainers.image.source="https://github.com/aws-samples/aws-mainframe-modernization-carddemo" \
      org.opencontainers.image.licenses="Apache-2.0"

RUN addgroup -S carddemo \
    && adduser -S carddemo -G carddemo

WORKDIR /carddemo

COPY --from=builder /artifacts/manifest.txt /artifacts/source-inventory.txt /artifacts/carddemo-bundle.tar.gz ./
COPY --from=builder /src/app ./app
COPY --from=builder /src/samples ./samples
COPY --from=builder /src/scripts ./scripts
COPY --from=builder /src/diagrams ./diagrams
COPY --from=builder /src/README.md /src/LICENSE /src/NOTICE ./
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
    && chown -R carddemo:carddemo /carddemo

USER carddemo

ENV CARDDEMO_ENTRY_TXN=CC00 \
    CARDDEMO_SIGNON_PROGRAM=COSGN00C \
    CARDDEMO_BATCH_JOB=POSTTRAN \
    CARDDEMO_HLQ=AWS.M2.CARDDEMO

HEALTHCHECK NONE

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["info"]
