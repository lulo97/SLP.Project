package com.app.backendjava.features.user;

import com.app.backendjava.features.dashboard.UserStatsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.Optional;

public interface IUserRepository {
    Optional<User> getByIdAsync(int id);
    Optional<User> getByEmailAsync(String email);
    Optional<User> getByUsernameAsync(String username);
    Optional<User> getByResetTokenAsync(String token);
    Optional<User> getByEmailVerificationTokenAsync(String token);

    User saveAsync(User user); // Handles both Create and Update
    void deleteAsync(User user);

    Page<User> getAllAsync(String search, Pageable pageable);
    UserStatsDto getUserStatsAsync(int userId);
}