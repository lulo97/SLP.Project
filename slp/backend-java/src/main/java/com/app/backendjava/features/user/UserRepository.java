package com.app.backendjava.features.user;

import com.app.backendjava.features.dashboard.UserStatsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Integer>, IUserRepository {

    @Override
    default Optional<User> getByIdAsync(int id) { return findById(id); }

    @Override
    @Query("SELECT u FROM User u WHERE u.email = :email")
    Optional<User> getByEmailAsync(@Param("email") String email);

    @Override
    @Query("SELECT u FROM User u WHERE u.username = :username")
    Optional<User> getByUsernameAsync(@Param("username") String username);

    @Override
    @Query("SELECT u FROM User u WHERE u.passwordResetToken = :token")
    Optional<User> getByResetTokenAsync(@Param("token") String token);

    @Override
    @Query("SELECT u FROM User u WHERE u.emailVerificationToken = :token")
    Optional<User> getByEmailVerificationTokenAsync(@Param("token") String token);

    @Override
    default User saveAsync(User user) { return save(user); }

    @Override
    default void deleteAsync(User user) { delete(user); }

    @Override
    @Query("SELECT u FROM User u WHERE (:search IS NULL OR " +
            "LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<User> getAllAsync(@Param("search") String search, Pageable pageable);

    // Note: This requires Quizzes, Questions, Sources, and FavoriteItems entities to exist
    @Query("SELECT new com.app.backendjava.features.dashboard.UserStatsDto(" +
            "(SELECT COUNT(q) FROM Quiz q WHERE q.userId = :userId AND q.disabled = false), " +
            "(SELECT COUNT(qn) FROM Question qn WHERE qn.userId = :userId), " +
            "(SELECT COUNT(s) FROM Source s WHERE s.userId = :userId AND s.deletedAt IS NULL), " +
            "(SELECT COUNT(f) FROM FavoriteItem f WHERE f.userId = :userId))")
    UserStatsDto getUserStatsAsync(@Param("userId") int userId);
}