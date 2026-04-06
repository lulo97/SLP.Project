package com.app.backendjava.features.session;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Repository
public interface SessionRepository extends JpaRepository<Session, String> {

    Optional<Session> findByTokenHash(String tokenHash);

    @Modifying
    @Transactional
    @Query("UPDATE Session s SET s.revoked = true WHERE s.id = :sessionId")
    void revokeAsync(@Param("sessionId") String sessionId);

    @Modifying
    @Transactional
    @Query("UPDATE Session s SET s.revoked = true WHERE s.userId = :userId AND s.revoked = false")
    void revokeAllForUserAsync(@Param("userId") Integer userId);

    @Modifying
    @Transactional
    @Query("UPDATE Session s SET s.revoked = true WHERE s.userId = :userId AND s.revoked = false AND s.id != :exceptSessionId")
    void revokeAllForUserExceptAsync(@Param("userId") Integer userId, @Param("exceptSessionId") String exceptSessionId);
}