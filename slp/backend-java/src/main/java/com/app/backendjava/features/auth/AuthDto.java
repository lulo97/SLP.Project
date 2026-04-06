package com.app.backendjava.features.auth;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

public class AuthDto {
    public record LoginRequest(String username, String password) {}
    public record ForgotPasswordRequest(String email) {}
    public record ResetPasswordRequest(String token, String newPassword) {}
    public record VerifyEmailRequest(String token) {}
    public record UpdateUserRequest(String name, String avatarUrl) {}
    public record ChangePasswordRequest(String currentPassword, String newPassword) {}
    public record RegisterUserRequest(String username, String email, String password) {}

    @Data
    public static class LoginResponse {
        private String token = "";
        private String userId = "";
        private String email = "";
    }

    @Data
    @Builder
    public static class LoginResult {
        private boolean success;
        private LoginResponse data;
        private String errorCode;
        private String message;
    }

    @Data
    public static class CurrentUserDto {
        private Integer id;
        private String username;
        private String email;
        private boolean emailConfirmed;
        private String role;
        private String status;
        private String avatarFilename;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class ChangePasswordResult {
        private boolean success;
        private String errorCode;
        private String message;
    }
}