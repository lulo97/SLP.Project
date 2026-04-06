package com.app.backendjava.features.email;

public interface IEmailService {
    void sendAsync(String to, String subject, String body);
    void sendHtmlAsync(String to, String subject, String htmlBody);
    void sendWithTemplateAsync(String to, String templateName, Object model);
}