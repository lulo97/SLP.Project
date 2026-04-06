package com.app.backendjava.features.auth;

import com.app.backendjava.features.user.*;
import com.app.backendjava.features.session.*;
import com.app.backendjava.features.email.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService implements IAuthService {
    private final IUserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final EmailService emailService;

    @Value("${frontend.base-url:http://localhost:3002}")
    private String frontendBaseUrl;

    @Override
    @Transactional
    public AuthDto.LoginResult loginAsync(String username, String password) {
        var user = userRepository.getByUsernameAsync(username).orElse(null);

        if (user == null) {
            return AuthDto.LoginResult.builder()
                    .success(false).errorCode("USER_NOT_FOUND").message("Invalid credentials").build();
        }

        if (!"active".equals(user.getStatus())) {
            return AuthDto.LoginResult.builder()
                    .success(false).errorCode("ACCOUNT_BANNED")
                    .message("Your account has been banned. Please contact support.").build();
        }

        if (!PasswordHasher.verify(password, user.getPasswordHash())) {
            return AuthDto.LoginResult.builder()
                    .success(false).errorCode("INVALID_PASSWORD").message("Invalid credentials").build();
        }

        String rawToken = SessionTokenService.generateToken();
        String hashedToken = SessionTokenService.hashToken(rawToken);

        Session session = Session.builder()
                .id(UUID.randomUUID().toString())
                .userId(user.getId())
                .tokenHash(hashedToken)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();

        sessionRepository.save(session);

        AuthDto.LoginResponse response = new AuthDto.LoginResponse();
        response.setToken(rawToken); // Send the raw token to the client
        response.setUserId(user.getId().toString());
        response.setEmail(user.getEmail());

        return AuthDto.LoginResult.builder().success(true).data(response).build();
    }

    @Override
    @Transactional
    public void logoutAsync(Authentication auth) {
        if (auth != null && auth.getDetails() instanceof String sessionId) {
            sessionRepository.revokeAsync(sessionId);
        }
    }

    @Override
    @Transactional
    public void requestPasswordResetAsync(String email) {
        userRepository.getByEmailAsync(email).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setPasswordResetToken(token);
            user.setPasswordResetExpiry(LocalDateTime.now().plusHours(1));
            userRepository.saveAsync(user);

            String resetLink = frontendBaseUrl + "/reset-password?token=" + token;
            emailService.sendHtmlAsync(user.getEmail(), "Reset Your Password", resetLink);
        });
    }

    @Override
    @Transactional
    public boolean confirmPasswordResetAsync(String token, String newPassword) {
        var user = userRepository.getByResetTokenAsync(token).orElse(null);
        if (user == null || user.getPasswordResetExpiry().isBefore(LocalDateTime.now())) {
            return false;
        }

        user.setPasswordHash(PasswordHasher.hash(newPassword));
        user.setPasswordResetToken(null);
        user.setPasswordResetExpiry(null);
        userRepository.saveAsync(user);

        sessionRepository.revokeAllForUserAsync(user.getId());
        return true;
    }

    @Override
    @Transactional
    public boolean verifyEmailAsync(String token) {
        var user = userRepository.getByEmailVerificationTokenAsync(token).orElse(null);
        if (user == null) return false;

        user.setEmailConfirmed(true);
        user.setEmailVerificationToken(null);
        userRepository.saveAsync(user);
        return true;
    }

    @Override
    @Transactional
    public void sendVerificationEmailAsync(String userId) {
        userRepository.getByIdAsync(Integer.parseInt(userId)).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setEmailVerificationToken(token);
            userRepository.saveAsync(user);

            String verifyLink = frontendBaseUrl + "/verify-email?token=" + token;
            emailService.sendHtmlAsync(user.getEmail(), "Verify Your Email", verifyLink);
        });
    }

    @Override
    @Transactional
    public AuthDto.ChangePasswordResult changePasswordAsync(String userId, String currentPassword, String newPassword, String currentSessionId) {
        var user = userRepository.getByIdAsync(Integer.parseInt(userId)).orElse(null);
        if (user == null) return AuthDto.ChangePasswordResult.builder().success(false).errorCode("USER_NOT_FOUND").message("User not found.").build();

        if (!PasswordHasher.verify(currentPassword, user.getPasswordHash())) {
            return AuthDto.ChangePasswordResult.builder().success(false).errorCode("INVALID_CURRENT_PASSWORD").message("Current password incorrect.").build();
        }

        user.setPasswordHash(PasswordHasher.hash(newPassword));
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.saveAsync(user);

        if (currentSessionId != null) {
            sessionRepository.revokeAllForUserExceptAsync(user.getId(), currentSessionId);
        } else {
            sessionRepository.revokeAllForUserAsync(user.getId());
        }

        return AuthDto.ChangePasswordResult.builder().success(true).build();
    }
}