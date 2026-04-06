package com.app.backendjava.features.auth;

import com.app.backendjava.features.user.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AuthController {
    private final IAuthService authService;
    private final UserService userService;

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody AuthDto.LoginRequest request) {
        var result = authService.loginAsync(request.username(), request.password());

        if (!result.isSuccess()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "code", result.getErrorCode(),
                    "message", result.getMessage()
            ));
        }
        return ResponseEntity.ok(result.getData());
    }

    @PostMapping("/auth/logout")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> logout(Authentication auth) {
        authService.logoutAsync(auth);
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/auth/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody AuthDto.ForgotPasswordRequest request) {
        authService.requestPasswordResetAsync(request.email());
        return ResponseEntity.ok(Map.of("message", "Password reset email sent if account exists."));
    }

    @PostMapping("/auth/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody AuthDto.ResetPasswordRequest request) {
        boolean success = authService.confirmPasswordResetAsync(request.token(), request.newPassword());
        if (!success) return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired token"));
        return ResponseEntity.ok(Map.of("message", "Password reset successful"));
    }

    @PostMapping("/auth/verify-email")
    public ResponseEntity<?> verifyEmail(@RequestBody AuthDto.VerifyEmailRequest request) {
        if (!authService.verifyEmailAsync(request.token()))
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid verification token"));
        return ResponseEntity.ok(Map.of("message", "Email verified successfully"));
    }

    @GetMapping("/users/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getCurrentUser(Authentication auth) {
        return userService.getByIdAsync(auth.getName())
                .map(user -> {
                    AuthDto.CurrentUserDto dto = new AuthDto.CurrentUserDto();
                    dto.setId(user.getId());
                    dto.setUsername(user.getUsername());
                    dto.setEmail(user.getEmail());
                    dto.setEmailConfirmed(user.isEmailConfirmed());
                    dto.setRole(user.getRole());
                    dto.setStatus(user.getStatus());
                    dto.setAvatarFilename(user.getAvatarFilename());
                    dto.setCreatedAt(user.getCreatedAt());
                    return ResponseEntity.ok(dto);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/auth/register")
    public ResponseEntity<?> register(@RequestBody AuthDto.RegisterUserRequest request) {
        return ResponseEntity.ok(userService.registerAsync(request));
    }

    @DeleteMapping("/users/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> deleteUser(@PathVariable int id, Authentication auth) {
        // Use getByIdAsync and check if the user exists and is an admin
        var currentUserOpt = userService.getByIdAsync(auth.getName());

        if (currentUserOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        // Checking if username is admin (as per your original logic)
        if (!"admin".equals(currentUserOpt.get().getRole())) { // Usually you check role, not username
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        boolean deleted = userService.deleteAsync(id);
        if (!deleted) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}