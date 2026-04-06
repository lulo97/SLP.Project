package com.app.backendjava.features.email;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "app.email")
public class EmailSettings {
    private String apiEndpoint = "http://mail:3000/send-email";
    private String fromEmail = "noreply@yourapp.com";
    private String fromName = "Your App";
}