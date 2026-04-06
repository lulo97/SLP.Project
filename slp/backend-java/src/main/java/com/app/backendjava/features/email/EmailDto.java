package com.app.backendjava.features.email;

record EmailPayload(
        String to,
        String subject,
        String html
) {}

record EmailErrorResponse(
        String error,
        String message
) {}