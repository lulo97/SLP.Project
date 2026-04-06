package com.app.backendjava.features.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService implements IEmailService {

    private final EmailSettings settings;
    private final RestClient restClient = RestClient.create();

    @Override
    public void sendAsync(String to, String subject, String body) {
        sendEmailRequest(new EmailPayload(to, subject, body));
    }

    @Override
    public void sendHtmlAsync(String to, String subject, String htmlBody) {
        sendEmailRequest(new EmailPayload(to, subject, htmlBody));
    }

    @Override
    public void sendWithTemplateAsync(String to, String templateName, Object model) {
        String subject = "Notification: " + templateName;
        String body = "Template: " + templateName + " | Data: " + model.toString();
        sendEmailRequest(new EmailPayload(to, subject, body));
    }

    private void sendEmailRequest(EmailPayload payload) {
        try {
            restClient.post()
                    .uri(settings.getApiEndpoint())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();

            log.info("Email sent successfully to {}", payload.to());

        } catch (org.springframework.web.client.RestClientResponseException ex) {
            // This catches 4xx and 5xx errors automatically
            EmailErrorResponse errorBody = ex.getResponseBodyAs(EmailErrorResponse.class);

            String errorMessage = (errorBody != null && errorBody.error() != null)
                    ? errorBody.error()
                    : "Email service error (" + ex.getStatusCode().value() + ")";

            log.error("Email microservice error: {} for {}", errorMessage, payload.to());
            throw new RuntimeException(errorMessage);

        } catch (Exception ex) {
            log.error("Connection failure to email microservice", ex);
            throw new RuntimeException("Email service unavailable", ex);
        }
    }
}