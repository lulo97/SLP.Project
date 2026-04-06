package com.app.backendjava.features.user;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;

    @Column(name = "username", nullable = false)
    private String username = "";

    @Column(name = "password_hash", nullable = false)
    private String passwordHash = "";

    @Column(name = "email", nullable = false)
    private String email = "";

    @Column(name = "email_confirmed")
    private boolean emailConfirmed;

    @Column(name = "role")
    private String role = "user";

    @Column(name = "status")
    private String status = "active";

    @Column(name = "avatar_filename")
    private String avatarFilename;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "password_reset_token")
    private String passwordResetToken;

    @Column(name = "password_reset_expiry")
    private LocalDateTime passwordResetExpiry;

    @Column(name = "email_verification_token")
    private String emailVerificationToken;
}