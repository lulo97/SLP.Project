package com.app.backendjava.features.user;

import com.app.backendjava.features.auth.PasswordHasher;
import com.app.backendjava.features.auth.AuthDto.RegisterUserRequest;
import com.app.backendjava.features.auth.AuthDto.UpdateUserRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserService implements IUserService {

    private final IUserRepository userRepository;

    @Override
    public Optional<User> getByIdAsync(String id) {
        try {
            int userId = Integer.parseInt(id);
            return userRepository.getByIdAsync(userId);
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }

    @Override
    @Transactional
    public User updateAsync(String id, UpdateUserRequest request) {
        return getByIdAsync(id).map(user -> {
            user.setUsername(request.name());
            user.setUpdatedAt(LocalDateTime.now());
            return userRepository.saveAsync(user);
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Override
    @Transactional
    public User registerAsync(RegisterUserRequest request) {
        if (userRepository.getByUsernameAsync(request.username()).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        if (userRepository.getByEmailAsync(request.email()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = User.builder()
                .username(request.username())
                .email(request.email())
                .passwordHash(PasswordHasher.hash(request.password()))
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .role("user")
                .status("active")
                .build();

        return userRepository.saveAsync(user);
    }

    @Override
    @Transactional
    public boolean deleteAsync(int userId) {
        return userRepository.getByIdAsync(userId).map(user -> {
            userRepository.deleteAsync(user);
            return true;
        }).orElse(false);
    }
}