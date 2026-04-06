package com.app.backendjava.features.email;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailRequest {
    @JsonProperty("to")
    private String to = "";

    @JsonProperty("from")
    private String from;

    @JsonProperty("fromName")
    private String fromName;

    @JsonProperty("subject")
    private String subject = "";

    @JsonProperty("body")
    private String body;

    @JsonProperty("html")
    private String htmlBody;

    @JsonProperty("isHtml")
    private boolean isHtml;

    @JsonProperty("headers")
    private Map<String, String> headers;
}