package com.amazonaws.carddemo.posting.model;

public record ValidationResult(int reasonCode, String reasonDescription) {
    public static final ValidationResult OK = new ValidationResult(0, "");

    public boolean isValid() {
        return reasonCode == 0;
    }
}
