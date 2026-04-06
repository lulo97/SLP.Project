package com.app.backendjava.features.auth;

import org.springframework.security.core.Authentication;

public interface IAuthService {
    AuthDto.LoginResult loginAsync(String username, String password);
    void logoutAsync(Authentication authentication);

    void requestPasswordResetAsync(String email);
    boolean confirmPasswordResetAsync(String token, String newPassword);

    boolean verifyEmailAsync(String token);
    void sendVerificationEmailAsync(String userId);

    AuthDto.ChangePasswordResult changePasswordAsync(
            String userId,
            String currentPassword,
            String newPassword,
            String currentSessionId);
}