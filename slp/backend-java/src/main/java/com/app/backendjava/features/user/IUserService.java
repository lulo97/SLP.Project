package com.app.backendjava.features.user;

import com.app.backendjava.features.auth.AuthDto.RegisterUserRequest;
import com.app.backendjava.features.auth.AuthDto.UpdateUserRequest;
import java.util.Optional;

public interface IUserService {
    Optional<User> getByIdAsync(String id);
    User updateAsync(String id, UpdateUserRequest request);
    User registerAsync(RegisterUserRequest request);
    boolean deleteAsync(int userId);
}