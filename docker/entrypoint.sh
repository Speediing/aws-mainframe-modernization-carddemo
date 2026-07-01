#!/bin/sh
set -eu

print_info() {
  echo "CardDemo - Mainframe Credit Card Management Application"
  echo "======================================================="
  if [ -f /carddemo/manifest.txt ]; then
    cat /carddemo/manifest.txt
  fi
  echo
  echo "Deployment:"
  echo "  HLQ:              ${CARDDEMO_HLQ}"
  echo "  Online entry:     CICS transaction ${CARDDEMO_ENTRY_TXN} (${CARDDEMO_SIGNON_PROGRAM})"
  echo "  Batch entry:      JCL job ${CARDDEMO_BATCH_JOB}"
  echo
  echo "This image packages CardDemo source artifacts for z/OS or AWS M2 deployment."
  echo "Upload app/, samples/, and scripts/ to your mainframe environment, then run"
  echo "the initialization JCL sequence documented in README.md."
}

print_inventory() {
  if [ -f /carddemo/source-inventory.txt ]; then
    cat /carddemo/source-inventory.txt
  else
    echo "Source inventory not found." >&2
    exit 1
  fi
}

extract_bundle() {
  target="${1:-/carddemo/export}"
  mkdir -p "${target}"
  tar -xzf /carddemo/carddemo-bundle.tar.gz -C "${target}"
  echo "Extracted CardDemo bundle to ${target}"
}

case "${1:-info}" in
  info)
    print_info
    ;;
  inventory)
    print_inventory
    ;;
  extract)
    extract_bundle "${2:-/carddemo/export}"
    ;;
  *)
    echo "Usage: $0 {info|inventory|extract [target-dir]}" >&2
    exit 1
    ;;
esac
